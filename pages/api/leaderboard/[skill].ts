// pages/api/leaderboard/[skill].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

const ALLOWED = {
  reading: 'v_leaderboard_reading',
  listening: 'v_leaderboard_listening',
  writing: 'v_leaderboard_writing',
  speaking: 'v_leaderboard_speaking',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { skill } = req.query;

  if (!skill || typeof skill !== 'string' || !ALLOWED[skill]) {
    return res.status(400).json({ error: 'Invalid skill leaderboard' });
  }

  const viewName = ALLOWED[skill];

  const supabase = getServerClient({ req, res });

  const { data, error } = await supabase
    .from(viewName)
    .select('*')
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ leaderboard: data });
}
