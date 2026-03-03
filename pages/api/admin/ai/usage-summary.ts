import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireRole, AuthError, writeAuthError } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  try {
    await requireRole(supabase, 'admin');
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }

  const since = (req.query.since as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('user_id, feature, requests, tokens, date')
    .gte('date', since)
    .order('date', { ascending: false })
    .limit(1000);

  if (error) return res.status(500).json({ error: error.message });

  const byFeature = new Map<string, number>();
  for (const row of data ?? []) {
    byFeature.set(row.feature, (byFeature.get(row.feature) ?? 0) + (row.requests ?? 0));
  }

  return res.status(200).json({
    ok: true,
    since,
    totalRows: (data ?? []).length,
    byFeature: Array.from(byFeature.entries()).map(([feature, requests]) => ({ feature, requests })),
  });
}
