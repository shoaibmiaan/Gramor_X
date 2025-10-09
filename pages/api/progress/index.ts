import type { NextApiRequest, NextApiResponse } from 'next';

import { buildProgressTrends, type BandRow } from '@/lib/analytics/progress';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return res.status(500).json({ error: authError.message });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const weeks = Math.min(Number(req.query.weeks) || 12, 52);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);
  const sinceIso = since.toISOString();

  const { data, error } = await supabase
    .from('progress_band_trajectory')
    .select('attempt_date, skill, band')
    .eq('user_id', user.id)
    .gte('attempt_date', sinceIso)
    .order('attempt_date', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const payload = buildProgressTrends(((data ?? []) as BandRow[]).map((row) => ({
    attempt_date: row.attempt_date,
    skill: row.skill,
    band: typeof row.band === 'number' ? row.band : Number(row.band ?? 0),
  })));

  return res.status(200).json(payload);
}
