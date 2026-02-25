// pages/api/gamification/award-writing.ts
// Awards XP for writing attempts once per attempt and per user.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { calculateWritingXp } from '@/lib/gamification/xp';
import { awardWritingXpSchema } from '@/lib/validation/writing.v2';

const ok = (res: NextApiResponse, payload: Record<string, unknown>) => res.status(200).json({ ok: true, ...payload });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = awardWritingXpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const { attemptId } = parsed.data;

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt || attempt.user_id !== user.id) {
    return res.status(404).json({ error: 'Attempt not found' });
  }

  const { data: existingEvent } = await supabase
    .from('user_xp_events')
    .select('id, points, reason')
    .eq('attempt_id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingEvent) {
    return ok(res, { points: existingEvent.points, reason: existingEvent.reason, duplicate: true });
  }

  const { data: responseRows } = await supabase
    .from('writing_responses')
    .select('exam_attempt_id, overall_band, submitted_at, created_at')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(10);

  const attempts: Array<{ id: string; overall: number; submittedAt: string | null }> = [];
  const grouped = new Map<string, { total: number; count: number; submittedAt: string | null }>();

  for (const row of responseRows ?? []) {
    const id = row.exam_attempt_id as string | null;
    if (!id) continue;
    const group = grouped.get(id) ?? { total: 0, count: 0, submittedAt: row.submitted_at ?? row.created_at ?? null };
    group.total += Number(row.overall_band ?? 0);
    group.count += 1;
    if (!group.submittedAt && (row.submitted_at || row.created_at)) {
      group.submittedAt = row.submitted_at ?? row.created_at ?? null;
    }
    grouped.set(id, group);
  }

  grouped.forEach((value, id) => {
    if (value.count === 0) return;
    attempts.push({ id, overall: Number((value.total / value.count).toFixed(1)), submittedAt: value.submittedAt });
  });

  attempts.sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  });

  const current = attempts.find((item) => item.id === attemptId);
  const previous = attempts.find((item) => item.id !== attemptId);

  if (!current) {
    return res.status(400).json({ error: 'Attempt missing responses' });
  }

  const xp = calculateWritingXp({
    currentOverall: current.overall,
    previousOverall: previous?.overall ?? null,
    submittedAt: current.submittedAt ?? attempt.submitted_at ?? attempt.updated_at ?? null,
    startedAt: attempt.started_at ?? attempt.created_at ?? null,
    durationSeconds: attempt.duration_seconds ?? null,
  });

  const { error: insertError } = await supabase.from('user_xp_events').insert({
    user_id: user.id,
    attempt_id: attemptId,
    source: 'writing',
    points: xp.points,
    reason: xp.reason,
  });

  if (insertError) {
    console.error('[gamification/award-writing] failed to insert xp event', insertError);
    return res.status(500).json({ error: 'Failed to record XP' });
  }

  const { error: eventError } = await supabase.from('exam_events').insert({
    attempt_id: attemptId,
    user_id: user.id,
    event_type: 'score',
    payload: {
      event: 'xp.award.writing',
      points: xp.points,
      reason: xp.reason,
      achievements: xp.achievements,
      improvement: xp.improvement,
      duration_seconds: xp.effectiveDuration,
    },
  });

  if (eventError) {
    console.error('[gamification/award-writing] failed to insert tracking event', eventError);
  }

  return ok(res, {
    points: xp.points,
    reason: xp.reason,
    achievements: xp.achievements,
    improvement: xp.improvement,
    durationSeconds: xp.effectiveDuration,
  });
}
