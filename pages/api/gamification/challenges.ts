import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseServer, supabaseService } from '@/lib/supabaseServer';

export type ChallengeDefinition = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: 'daily' | 'weekly';
  topic: string | null;
  goal: number;
  xpReward: number;
  xpEvent: string;
  progress?: ChallengeProgress;
};

export type ChallengeProgress = {
  challengeId: string;
  progressCount: number;
  totalMastered: number;
  target: number;
  lastIncrementedAt: string | null;
  resetsAt: string | null;
};

type ResponseBody = { ok: true; challenges: ChallengeDefinition[] } | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const svc = supabaseService();
    const { data: challengeRows, error: challengeErr } = await svc
      .from('challenges')
      .select('id, slug, title, description, challenge_type, topic, goal, xp_reward, xp_event')
      .order('challenge_type', { ascending: true })
      .order('created_at', { ascending: true });

    if (challengeErr) {
      if ((challengeErr as { code?: string }).code === '42P01') {
        return res.status(200).json({ ok: true, challenges: [] });
      }
      throw challengeErr;
    }

    const client = supabaseServer(req, res);
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user ?? null;

    let progressMap = new Map<string, ChallengeProgress>();

    if (user) {
      const { data: progressRows, error: progressErr } = await client
        .from('user_challenge_progress')
        .select('challenge_id, progress_count, total_mastered, target, last_incremented_at, resets_at');

      if (progressErr && (progressErr as { code?: string }).code === '42P01') {
        // Table not provisioned yet; safe to ignore in local/dev environments.
      } else if (!progressErr && Array.isArray(progressRows)) {
        progressMap = new Map(
          progressRows.map((row: any) => [
            row.challenge_id as string,
            {
              challengeId: row.challenge_id as string,
              progressCount: row.progress_count ?? 0,
              totalMastered: row.total_mastered ?? 0,
              target: row.target ?? 0,
              lastIncrementedAt: row.last_incremented_at ?? null,
              resetsAt: row.resets_at ?? null,
            },
          ]),
        );
      }
    }

    const challenges: ChallengeDefinition[] = (challengeRows ?? []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description ?? null,
      type: row.challenge_type,
      topic: row.topic ?? null,
      goal: row.goal ?? 0,
      xpReward: row.xp_reward ?? 0,
      xpEvent: row.xp_event,
      progress: progressMap.get(row.id) ?? undefined,
    }));

    return res.status(200).json({ ok: true, challenges });
  } catch (error: any) {
    console.error('[api/gamification/challenges] failed', error);
    return res.status(500).json({ ok: false, error: error?.message ?? 'Unexpected error' });
  }
}
