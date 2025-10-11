// pages/api/words/today.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveDayISO } from '@/lib/daily-learning-time';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerClient } from '@/lib/supabaseServer';

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

  // ✅ Deterministic active-day calculation (respects user’s chosen learning window)
  const date = getActiveDayISO();

  try {
    // Try Bearer first (mobile/cron); else fall back to SSR cookie session.
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : '';

    let userId: string | null = null;

    if (bearer) {
      const { data: userRes } = await supabaseAdmin.auth.getUser(bearer);
      userId = userRes?.user?.id ?? null;
    } else {
      const supabase = getServerClient(req, res);
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    // Fetch Word-of-the-Day from SQL function; safe fallback on error.
    const { data: wod, error: wodErr } = await supabaseAdmin
      .rpc('get_word_of_day', { d: date })
      .single();

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

    // No caching; today’s word/streak is per-user stateful.
    res.setHeader('Cache-Control', 'no-store');

    // Anonymous: return public word with zeroed streaks.
    if (!userId) {
      return res.status(200).json({ word, ...ZERO_STREAK });
    }

    // Learned today?
    const { data: learnedRow } = await supabaseAdmin
      .from('user_word_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('learned_on', date)
      .maybeSingle();

    // Current streak via RPC
    const { data: streak } = await supabaseAdmin.rpc('calc_streak', { p_user: userId });
    const streakDays = Number.isFinite(streak as number) ? (streak as number) : 0;

    // Longest streak from table (fallback to current streak)
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
    // Graceful fallback with public content
    return res.status(200).json({ word: FALLBACK_WORD, ...ZERO_STREAK });
  }
}
