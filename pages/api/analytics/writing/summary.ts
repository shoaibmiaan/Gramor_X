// pages/api/analytics/writing/summary.ts
// Returns the most recent writing attempts along with aggregate metrics.

import type { NextApiRequest, NextApiResponse } from 'next';

import { computeWritingSummary } from '@/lib/analytics/writing';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingAttemptSummary } from '@/types/analytics';
import type { WritingResponse } from '@/types/writing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
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

  const { data: responseRows, error: responsesError } = await supabase
    .from('writing_responses')
    .select(
      'id, exam_attempt_id, prompt_id, task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version, tokens_used, submitted_at, created_at',
    )
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(30);

  if (responsesError) {
    return res.status(500).json({ error: 'Failed to load responses' });
  }

  const attemptIds = Array.from(
    new Set((responseRows ?? []).map((row) => row.exam_attempt_id).filter(Boolean) as string[]),
  );

  const { data: attemptRows } = await supabase
    .from('exam_attempts')
    .select('id, created_at, submitted_at, duration_seconds, goal_band')
    .in('id', attemptIds.length ? attemptIds : ['00000000-0000-0000-0000-000000000000']);

  const responses: WritingResponse[] = (responseRows ?? []).map((row) => ({
    id: row.id,
    attemptId: row.exam_attempt_id ?? undefined,
    examAttemptId: row.exam_attempt_id ?? undefined,
    promptId: row.prompt_id ?? undefined,
    task: row.task ?? undefined,
    answerText: row.answer_text ?? undefined,
    wordCount: row.word_count ?? undefined,
    overallBand: row.overall_band ?? undefined,
    bandScores: (row.band_scores as any) ?? undefined,
    feedback: (row.feedback as any) ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    evaluationVersion: row.evaluation_version ?? undefined,
    tokensUsed: row.tokens_used ?? undefined,
    createdAt: row.created_at,
    submittedAt: row.submitted_at ?? undefined,
    metadata: null,
  }));

  const bandByAttempt = responses.reduce<Record<string, { total: number; count: number }>>((acc, row) => {
    if (!row.examAttemptId || typeof row.overallBand !== 'number') return acc;
    const bucket = (acc[row.examAttemptId] ??= { total: 0, count: 0 });
    bucket.total += row.overallBand;
    bucket.count += 1;
    return acc;
  }, {});

  const attempts: WritingAttemptSummary[] = (attemptRows ?? []).map((row) => ({
    attemptId: row.id,
    createdAt: row.created_at,
    overallBand:
      row.id in bandByAttempt && bandByAttempt[row.id].count > 0
        ? Number((bandByAttempt[row.id].total / bandByAttempt[row.id].count).toFixed(2))
        : 0,
    durationSeconds: row.duration_seconds ?? undefined,
    goalBand: row.goal_band ?? undefined,
  }));

  const summary = computeWritingSummary(responses, attempts);

  return res.status(200).json({ ok: true, summary, responses, attempts });
}
