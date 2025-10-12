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
      .select('target')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (progressErr) {
      throw progressErr;
    }

    const target = challenge.goal ?? progressRow?.target ?? 0;
    if (!target || target <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid challenge target' });
    }

    const { data: rpcResult, error: rpcErr } = await svc.rpc('increment_challenge_progress', {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_now: now.toUTC().toISO(),
      p_target: target,
      p_reset_type: challenge.challenge_type,
      p_time_zone: TIME_ZONE,
    });

    if (rpcErr) {
      throw rpcErr;
    }

    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!result) {
      throw new Error('Failed to persist challenge progress');
    }

    let xpAwarded = 0;
    if (result.incremented) {
      xpAwarded = await logXpEvent(user.id, challenge.xp_event as any, {
        challengeId,
        scope: challenge.challenge_type,
      });
    }

    return res.status(200).json({
      ok: true,
      xpAwarded,
      progress: {
        challengeId,
        progressCount: result.progress_count ?? 0,
        totalMastered: result.total_mastered ?? 0,
        target: result.target ?? target,
        lastIncrementedAt: result.last_incremented_at ?? null,
        resetsAt: result.resets_at ?? null,
      },
    });
  } catch (error: any) {
    console.error('[api/gamification/challenges/progress] failed', error);
    return res.status(500).json({ ok: false, error: error?.message ?? 'Unexpected error' });
  }
}
