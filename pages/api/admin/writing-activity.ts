// pages/api/admin/writing-activity.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/plan/withPlan';

const Query = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

type Row = {
  user_id: string;
  total: number;
  tip_count: number;
  micro_count: number;
  last_at: string;
  full_name?: string | null;
};

type Ok = {
  windowDays: number;
  totalEvents: number;
  users: Row[];
};
type Err = { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const parse = Query.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });
  const { days, limit } = parse.data;

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return res.status(401).json({ error: 'Unauthorized' });

  // Pull raw events in window (bounded)
  const { data: logs, error } = await supabase
    .from('writing_activity_log')
    .select('user_id, kind, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(10000);

  if (error) {
    return res.status(500).json({ error: 'Fetch failed', details: { code: error.code, message: error.message } });
  }

  // Aggregate in memory
  const agg = new Map<string, Row>();
  let totalEvents = 0;

  for (const row of logs || []) {
    totalEvents++;
    const uid = row.user_id as string;
    const kind = row.kind as 'tip' | 'micro';
    const created = row.created_at as string;

    const curr = agg.get(uid) || {
      user_id: uid,
      total: 0,
      tip_count: 0,
      micro_count: 0,
      last_at: created,
      full_name: null,
    };

    curr.total += 1;
    if (kind === 'tip') curr.tip_count += 1;
    if (kind === 'micro') curr.micro_count += 1;
    if (created > curr.last_at) curr.last_at = created;

    agg.set(uid, curr);
  }

  let users = Array.from(agg.values()).sort((a, b) => b.total - a.total).slice(0, limit);

  // Enrich with profile names (email joins to auth.users are avoided)
  const ids = users.map((u) => u.user_id);
  if (ids.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ids);

    const nameById = new Map<string, string | null>((profs || []).map((p) => [p.id as string, (p.full_name as string) ?? null]));
    users = users.map((u) => ({ ...u, full_name: nameById.get(u.user_id) ?? null }));
  }

  return res.status(200).json({
    windowDays: days,
    totalEvents,
    users,
  });
}

// Admin/Teacher only; or master plan.
// Adjust if your policy differs.
export default withPlan('master', handler, { allowRoles: ['admin', 'teacher'] });
