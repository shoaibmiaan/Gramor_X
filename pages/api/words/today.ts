// pages/api/words/today.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveDayISO } from '@/lib/daily-learning-time';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';

type WordPronunciationPayload = {
  ipa?: string | null;
  audioUrl?: string | null;
  locale?: string | null;
  label?: string | null;
};

type WordPayload = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  synonyms: string[];
  interest: string | null;
  partOfSpeech: string | null;
  categories: string[];
  pronunciations: WordPronunciationPayload[];
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
  partOfSpeech: 'verb',
  categories: ['Mindset', 'Motivation'],
  pronunciations: [
    {
      ipa: '/pər.səˈvɪr/',
      locale: 'en-US',
      label: 'American',
    },
    {
      ipa: '/ˌpɜː.sɪˈvɪə/',
      locale: 'en-GB',
      label: 'British',
    },
  ],
};

const ZERO_STREAK: Pick<TodayOut, 'learnedToday' | 'streakDays' | 'longestStreak' | 'streakValueUSD'> = {
  learnedToday: false,
  streakDays: 0,
  longestStreak: 0,
  streakValueUSD: 0,
};

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function maybeUuid(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return UUID_RE.test(value) ? value : null;
}

function normalisePronunciations(wod: Record<string, unknown> | null | undefined) {
  if (!wod) return FALLBACK_WORD.pronunciations;

  const pronunciations: WordPronunciationPayload[] = [];

  const push = (value: Partial<WordPronunciationPayload> | null | undefined) => {
    if (!value) return;
    const cleaned: WordPronunciationPayload = {
      ipa: typeof value.ipa === 'string' && value.ipa.trim().length > 0 ? value.ipa.trim() : null,
      audioUrl:
        typeof value.audioUrl === 'string' && value.audioUrl.trim().length > 0 ? value.audioUrl.trim() : null,
      locale: typeof value.locale === 'string' && value.locale.trim().length > 0 ? value.locale.trim() : null,
      label: typeof value.label === 'string' && value.label.trim().length > 0 ? value.label.trim() : null,
    };

    if (cleaned.ipa || cleaned.audioUrl || cleaned.label || cleaned.locale) {
      pronunciations.push(cleaned);
    }
  };

  // Support RPC returning an array under different keys.
  const raw = (wod as { pronunciations?: unknown; pronunciation?: unknown }).pronunciations ??
    (wod as { pronunciations?: unknown; pronunciation?: unknown }).pronunciation;

  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        const candidate = entry as Record<string, unknown>;
        push({
          ipa: typeof candidate.ipa === 'string' ? candidate.ipa : null,
          audioUrl: typeof candidate.audioUrl === 'string' ? candidate.audioUrl : null,
          locale: typeof candidate.locale === 'string' ? candidate.locale : null,
          label: typeof candidate.label === 'string' ? candidate.label : null,
        });
      }
    });
  } else if (raw && typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>;
    push({
      ipa: typeof candidate.ipa === 'string' ? candidate.ipa : null,
      audioUrl: typeof candidate.audioUrl === 'string' ? candidate.audioUrl : null,
      locale: typeof candidate.locale === 'string' ? candidate.locale : null,
      label: typeof candidate.label === 'string' ? candidate.label : null,
    });
  }

  const maybePushLegacy = (
    ipaKey: string,
    audioKey: string,
    locale: string,
    label: string,
  ) => {
    const ipa = typeof (wod as Record<string, unknown>)[ipaKey] === 'string'
      ? String((wod as Record<string, unknown>)[ipaKey])
      : null;
    const audio = typeof (wod as Record<string, unknown>)[audioKey] === 'string'
      ? String((wod as Record<string, unknown>)[audioKey])
      : null;
    if (ipa || audio) {
      push({ ipa, audioUrl: audio, locale, label });
    }
  };

  maybePushLegacy('ipa_us', 'audio_us', 'en-US', 'American');
  maybePushLegacy('ipa_uk', 'audio_uk', 'en-GB', 'British');
  maybePushLegacy('pronunciation_ipa_us', 'pronunciation_audio_us', 'en-US', 'American');
  maybePushLegacy('pronunciation_ipa_uk', 'pronunciation_audio_uk', 'en-GB', 'British');

  if (pronunciations.length === 0) {
    return FALLBACK_WORD.pronunciations;
  }

  return pronunciations;
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
          partOfSpeech:
            typeof wod.part_of_speech === 'string'
              ? wod.part_of_speech
              : typeof wod.pos === 'string'
                ? wod.pos
                : null,
          categories: Array.isArray(wod.categories)
            ? (wod.categories as (string | null)[]).filter(
                (item): item is string => typeof item === 'string' && item.trim().length > 0,
              )
            : [],
          pronunciations: normalisePronunciations(wod),
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
