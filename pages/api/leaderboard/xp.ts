import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseService } from '@/lib/supabaseServer';

const VALID_SCOPES = new Set(['daily', 'weekly']);

type Scope = 'daily' | 'weekly';

type LeaderboardEntry = {
  userId: string;
  fullName: string;
  xp: number;
  rank: number;
  snapshotDate: string;
};

type ResponseBody =
  | {
      ok: true;
      entries: Record<Scope, LeaderboardEntry[]>;
      warnings?: Array<{ scope: Scope; message: string }>;
    }
  | { ok: false; error: string };

async function latestSnapshot(scope: Scope) {
  const svc = supabaseService();
  const { data, error } = await svc
    .from('xp_leaderboard_entries')
    .select('snapshot_date')
    .eq('scope', scope)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.snapshot_date ?? null;
}

async function loadEntries(scope: Scope, snapshotDate: string): Promise<LeaderboardEntry[]> {
  const svc = supabaseService();
  const { data, error } = await svc
    .from('xp_leaderboard_entries')
    .select('user_id, xp, rank, snapshot_date, profiles(full_name)')
    .eq('scope', scope)
    .eq('snapshot_date', snapshotDate)
    .order('rank', { ascending: true })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    xp: row.xp ?? 0,
    rank: row.rank ?? 0,
    snapshotDate: row.snapshot_date,
    fullName: row.profiles?.full_name ?? 'Anonymous',
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const scopeParam = (req.query.scope as string | undefined)?.toLowerCase();
  const scopes: Scope[] = scopeParam && VALID_SCOPES.has(scopeParam as Scope)
    ? [scopeParam as Scope]
    : ['daily', 'weekly'];

  const result: Record<Scope, LeaderboardEntry[]> = { daily: [], weekly: [] } as Record<Scope, LeaderboardEntry[]>;
  const warnings: Array<{ scope: Scope; message: string }> = [];

  await Promise.all(
    scopes.map(async (scope) => {
      try {
        const snapshotDate = await latestSnapshot(scope);
        if (!snapshotDate) {
          result[scope] = [];
          return;
        }

        result[scope] = await loadEntries(scope, snapshotDate);
      } catch (error: any) {
        const message = error?.message ?? 'Unexpected error';
        warnings.push({ scope, message });
        result[scope] = [];
        console.error(`[api/leaderboard/xp] failed to load ${scope} snapshot`, error);
      }
    }),
  );

  if (warnings.length > 0) {
    return res.status(200).json({ ok: true, entries: result, warnings });
  }

  return res.status(200).json({ ok: true, entries: result });
}
