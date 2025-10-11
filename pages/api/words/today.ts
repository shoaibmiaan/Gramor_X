import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveDayISO } from '@/lib/daily-learning-time';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type WordPayload = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  synonyms: string[];
  interest: string | null;
};

type TodayOut = {
  word: WordPayload;
  learnedToday: boolean;
  streakDays: number;
  longestStreak: number;
  streakValueUSD: number;
};

type ErrorOut = { error: string };

const FALLBACK_WORD: WordPayload = {
  id: 'fallback',
  word: 'persevere',
  meaning: 'continue in a course of action even in the face of difficulty',
  example: 'Persevere through practice to reach Band 8+.',
  synonyms: ['persist', 'endure'],
  interest: 'Connect “persevere” with IELTS speaking by sharing persistence stories.',
};

const ZERO_STREAK: Pick<TodayOut, 'learnedToday' | 'streakDays' | 'longestStreak' | 'streakValueUSD'> = {
  learnedToday: false,
  streakDays: 0,
  longestStreak: 0,
  streakValueUSD: 0,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TodayOut | ErrorOut>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const date = getActiveDayISO();

  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : '';

    let userId: string | null = null;
    if (token) {
      const { data: userRes } = await supabaseAdmin.auth.getUser(token);
      userId = userRes?.user?.id ?? null;
    }

    const { data: wod, error: wodErr } = await supabaseAdmin.rpc('get_word_of_day', { d: date }).single();
    const word: WordPayload = wodErr || !wod
      ? FALLBACK_WORD
      : {
          id: wod.id,
          word: wod.word,
          meaning: wod.meaning,
          example: wod.example ?? null,
          synonyms: Array.isArray(wod.synonyms)
            ? (wod.synonyms as (string | null)[]).filter(
                (item): item is string => typeof item === 'string' && item.trim().length > 0,
              )
            : [],
          interest: typeof wod.interest_hook === 'string' ? wod.interest_hook : null,
        };

    res.setHeader('Cache-Control', 'no-store');

    if (!userId) {
      return res.status(200).json({ word, ...ZERO_STREAK });
    }

    const { data: learnedRow } = await supabaseAdmin
      .from('user_word_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('learned_on', date)
      .maybeSingle();

    const { data: streak } = await supabaseAdmin.rpc('calc_streak', { p_user: userId });
    const streakDays = Number.isFinite(streak as number) ? (streak as number) : 0;

    const { data: streakRow } = await supabaseAdmin
      .from('streaks')
      .select('longest')
      .eq('user_id', userId)
      .maybeSingle();

    const longest = Number.isFinite(streakRow?.longest as number)
      ? (streakRow?.longest as number)
      : streakDays;

    return res.status(200).json({
      word,
      learnedToday: Boolean(learnedRow),
      streakDays,
      longestStreak: longest,
      streakValueUSD: streakDays * 0.5,
    });
  } catch (error) {
    console.error('[api/words/today] unexpected error', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ word: FALLBACK_WORD, ...ZERO_STREAK });
  }
}
