import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveDayISO } from '@/lib/daily-learning-time';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type LearnIn = { wordId?: string };
type LearnOut =
  | { ok: true; learnedOn: string; streakDays: number; longestStreak: number }
  | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<LearnOut>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1] ?? '';
  const { data: userRes, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !userRes?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userRes.user.id;

  const { wordId }: LearnIn = req.body ?? {};
  if (!wordId) return res.status(400).json({ error: 'wordId required' });

  const todayISO = getActiveDayISO();

  // Upsert once per day
  const { error: upErr } = await supabaseAdmin.from('user_word_logs').upsert(
    { user_id: userId, word_id: wordId, learned_on: todayISO },
    { onConflict: 'user_id,learned_on' }
  );
  if (upErr) return res.status(500).json({ error: 'Unable to mark learned' });

  const { data: streak } = await supabaseAdmin.rpc('calc_streak', { p_user: userId });
  const currentStreak = Number.isFinite(streak as number) ? (streak as number) : 0;

  const { data: streakRow } = await supabaseAdmin
    .from('word_learning_streaks')
    .select('longest')
    .eq('user_id', userId)
    .maybeSingle();

  const longest = Number.isFinite(streakRow?.longest as number)
    ? (streakRow?.longest as number)
    : Math.max(currentStreak, 0);

  return res.status(200).json({
    ok: true,
    learnedOn: todayISO,
    streakDays: currentStreak,
    longestStreak: longest,
  });
}
