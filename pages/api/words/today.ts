// pages/api/words/today.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveDayISO } from '@/lib/daily-learning-time';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { trackor } from '@/lib/analytics/trackor.server';
import {
  FALLBACK_WORD,
  ZERO_STREAK,
  normaliseWordPayload,
  pickGuestWord,
  resolveUserId,
  type WordPayload,
} from '@/lib/vocabulary/word-shared';

type TodayOut = {
  word: WordPayload;
  learnedToday: boolean;
  streakDays: number;
  longestStreak: number;
  streakValueUSD: number;
};

type ErrorOut = { error: string };

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function maybeUuid(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return UUID_RE.test(value) ? value : null;
}

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
    const userId = await resolveUserId(req, res);

    // Fetch Word-of-the-Day from SQL function; safe fallback on error.
    const { data: wod, error: wodErr } = await supabaseAdmin
      .rpc('get_word_of_day', { d: date })
      .single();

    const word: WordPayload = wodErr || !wod
      ? FALLBACK_WORD
      : normaliseWordPayload(wod as Record<string, unknown>, FALLBACK_WORD);

    // No caching; today’s word/streak is per-user stateful.
    res.setHeader('Cache-Control', 'no-store');

    // Anonymous: return a rotating guest word with zeroed streaks.
    if (!userId) {
      return res.status(200).json({ word: pickGuestWord(), ...ZERO_STREAK });
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
      .from('word_learning_streaks')
      .select('longest')
      .eq('user_id', userId)
      .maybeSingle();

    const longest = Number.isFinite(streakRow?.longest as number)
      ? (streakRow?.longest as number)
      : streakDays;

    const payload: TodayOut = {
      word,
      learnedToday: Boolean(learnedRow),
      streakDays,
      longestStreak: longest,
      streakValueUSD: streakDays * 0.5,
    };

    if (!learnedRow) {
      try {
        await trackor.log('vocab_review_start', {
          user_id: userId,
          word_id: word.id,
          streak_days: streakDays,
          longest_streak: longest,
        });
      } catch (error) {
        console.warn('[api/words/today] analytics failed', error);
      }
      try {
        await supabaseAdmin.from('review_events').insert({
          user_id: userId,
          event: 'open',
          source: 'daily_word',
          word_id: maybeUuid(word.id),
        });
      } catch (error) {
        console.warn('[api/words/today] review open log failed', error);
      }
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[api/words/today] unexpected error', error);
    res.setHeader('Cache-Control', 'no-store');
    // Graceful fallback with public content
    return res.status(200).json({ word: FALLBACK_WORD, ...ZERO_STREAK });
  }
}
