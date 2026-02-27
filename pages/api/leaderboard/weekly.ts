// pages/api/leaderboard/weekly.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient({ req, res });

  const { data, error } = await supabase
    .from('v_leaderboard_weekly')
    .select('*')
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ leaderboard: data });
}
