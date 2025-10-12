import type { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';

import { supabaseServer, supabaseService } from '@/lib/supabaseServer';
import { logXpEvent } from '@/lib/xp';

const TIME_ZONE = 'Asia/Karachi';

interface Body {
  challengeId?: string;
}

type ResponseBody =
  | {
      ok: true;
      progress: {
        challengeId: string;
        progressCount: number;
        totalMastered: number;
        target: number;
        lastIncrementedAt: string | null;
        resetsAt: string | null;
      };
      xpAwarded: number;
    }
  | { ok: false; error: string };

function nextReset(now: DateTime, type: 'daily' | 'weekly'): DateTime {
  if (type === 'daily') {
    return now.plus({ days: 1 }).startOf('day');
  }
  const weekday = now.weekday; // 1 Monday … 7 Sunday
  const daysUntilNextMonday = weekday === 1 ? 7 : 8 - weekday;
  return now.plus({ days: daysUntilNextMonday }).startOf('day');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body as Body;
    const challengeId = body.challengeId;
    if (!challengeId) {
      return res.status(400).json({ ok: false, error: 'challengeId required' });
    }

    const client = supabaseServer(req, res);
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const svc = supabaseService();
    const { data: challenge, error: challengeErr } = await svc
      .from('challenges')
      .select('id, challenge_type, goal, xp_event')
      .eq('id', challengeId)
      .maybeSingle();

    if (challengeErr || !challenge) {
      return res.status(404).json({ ok: false, error: 'Challenge not found' });
    }

    const now = DateTime.now().setZone(TIME_ZONE);

    const { data: progressRow, error: progressErr } = await svc
      .from('user_challenge_progress')
      .select('id, progress_count, total_mastered, target, resets_at, last_incremented_at')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (progressErr) {
      throw progressErr;
    }

    let progressCount = progressRow?.progress_count ?? 0;
    let totalMastered = progressRow?.total_mastered ?? 0;
    const target = challenge.goal ?? progressRow?.target ?? 0;
    let resetsAt = progressRow?.resets_at ? DateTime.fromISO(progressRow.resets_at).setZone(TIME_ZONE) : null;

    if (!resetsAt || resetsAt <= now) {
      progressCount = 0;
      resetsAt = nextReset(now, challenge.challenge_type as 'daily' | 'weekly');
    }

    const canIncrement = progressCount < target;
    let xpAwarded = 0;

    if (canIncrement) {
      progressCount += 1;
      totalMastered += 1;
      xpAwarded = await logXpEvent(user.id, challenge.xp_event as any, {
        challengeId,
        scope: challenge.challenge_type,
      });
    }

    const payload = {
      user_id: user.id,
      challenge_id: challengeId,
      progress_count: progressCount,
      total_mastered: totalMastered,
      target,
      last_incremented_at: canIncrement
        ? now.toUTC().toISO()
        : progressRow?.last_incremented_at ?? null,
      resets_at: resetsAt.toUTC().toISO(),
    };

    const { data: upserted, error: upsertErr } = await svc
      .from('user_challenge_progress')
      .upsert(payload, { onConflict: 'user_id,challenge_id' })
      .select('progress_count, total_mastered, target, last_incremented_at, resets_at')
      .single();

    if (upsertErr) {
      throw upsertErr;
    }

    return res.status(200).json({
      ok: true,
      xpAwarded,
      progress: {
        challengeId,
        progressCount: upserted.progress_count ?? 0,
        totalMastered: upserted.total_mastered ?? 0,
        target: upserted.target ?? target,
        lastIncrementedAt: upserted.last_incremented_at ?? null,
        resetsAt: upserted.resets_at ?? null,
      },
    });
  } catch (error: any) {
    console.error('[api/gamification/challenges/progress] failed', error);
    return res.status(500).json({ ok: false, error: error?.message ?? 'Unexpected error' });
  }
}
