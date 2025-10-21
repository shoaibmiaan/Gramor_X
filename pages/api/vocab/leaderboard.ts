import type { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';

import { supabaseService } from '@/lib/supabaseServer';
import { ACTIVE_LEARNING_TIMEZONE } from '@/lib/daily-learning-time';

type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
};

type LeaderboardResponse = { entries: LeaderboardEntry[] };

type ErrorResponse = { error: string };

function currentIsoWeekRange(zone: string) {
  const now = DateTime.now().setZone(zone);
  let start = now.set({ weekday: 1, hour: 0, minute: 0, second: 0, millisecond: 0 });
  if (start > now) {
    start = start.minus({ days: 7 });
  }
  const end = start.plus({ days: 7 });
  return { start, end };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse | ErrorResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const svc = supabaseService();
    const { start, end } = currentIsoWeekRange(ACTIVE_LEARNING_TIMEZONE);

    const { data, error } = await svc
      .from('xp_events')
      .select('user_id, total:sum(amount)')
      .eq('source', 'vocab')
      .gte('created_at', start.toISO())
      .lt('created_at', end.toISO())
      .group('user_id');

    if (error) {
      throw error;
    }

    const aggregated = (data ?? [])
      .map((row: any) => ({
        userId: row.user_id as string,
        xp: Number(row.total ?? 0),
      }))
      .filter((row) => row.userId)
      .sort((a, b) => (b.xp === a.xp ? a.userId.localeCompare(b.userId) : b.xp - a.xp))
      .slice(0, 50);

    const userIds = aggregated.map((row) => row.userId);
    const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await svc
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profileError) {
        throw profileError;
      }

      for (const row of profileRows ?? []) {
        if (row?.id) {
          profiles[row.id as string] = {
            full_name: (row.full_name as string | null) ?? null,
            avatar_url: (row.avatar_url as string | null) ?? null,
          };
        }
      }
    }

    const entries: LeaderboardEntry[] = aggregated.map((row, index) => {
      const profile = profiles[row.userId] ?? { full_name: null, avatar_url: null };
      return {
        rank: index + 1,
        userId: row.userId,
        displayName: profile.full_name?.trim() || 'Learner',
        avatarUrl: profile.avatar_url ?? null,
        xp: row.xp,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ entries });
  } catch (error) {
    console.error('[api/vocab/leaderboard] failed', error);
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }
}
