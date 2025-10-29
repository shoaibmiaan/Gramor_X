import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerClient } from '@/lib/supabaseServer';

export type WordPronunciationPayload = {
  ipa?: string | null;
  audioUrl?: string | null;
  locale?: string | null;
  label?: string | null;
};

export type WordPayload = {
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

export type WordOfTheDayGuestWord = WordPayload & {
  source?: string;
};

const DEFAULT_PRONUNCIATIONS: WordPronunciationPayload[] = [
  {
    ipa: '/pər.səˈvɪr/',
    locale: 'en-US',
    label: 'American',
  },
  {
    ipa: '/ˈpɜː.sɪˌvɪə/',
    locale: 'en-GB',
    label: 'British',
  },
];

function normaliseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
      .filter((entry): entry is string => Boolean(entry && entry.length > 0));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

export function normalisePronunciations(wod: Record<string, unknown> | null | undefined) {
  if (!wod) return DEFAULT_PRONUNCIATIONS;

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
    return DEFAULT_PRONUNCIATIONS;
  }

  return pronunciations;
}

export function normaliseWordPayload(
  wod: Record<string, unknown> | null | undefined,
  fallback: WordPayload,
): WordPayload {
  if (!wod) return fallback;

  return {
    id: typeof (wod as Record<string, unknown>).id === 'string' ? String((wod as Record<string, unknown>).id) : fallback.id,
    word: typeof (wod as Record<string, unknown>).word === 'string'
      ? String((wod as Record<string, unknown>).word)
      : fallback.word,
    meaning: typeof (wod as Record<string, unknown>).meaning === 'string'
      ? String((wod as Record<string, unknown>).meaning)
      : fallback.meaning,
    example:
      typeof (wod as Record<string, unknown>).example === 'string'
        ? String((wod as Record<string, unknown>).example)
        : null,
    synonyms: normaliseStringArray((wod as Record<string, unknown>).synonyms),
    interest:
      typeof (wod as Record<string, unknown>).interest_hook === 'string'
        ? String((wod as Record<string, unknown>).interest_hook)
        : typeof (wod as Record<string, unknown>).interest === 'string'
          ? String((wod as Record<string, unknown>).interest)
          : null,
    partOfSpeech:
      typeof (wod as Record<string, unknown>).part_of_speech === 'string'
        ? String((wod as Record<string, unknown>).part_of_speech)
        : typeof (wod as Record<string, unknown>).pos === 'string'
          ? String((wod as Record<string, unknown>).pos)
          : null,
    categories: normaliseStringArray((wod as Record<string, unknown>).categories),
    pronunciations: normalisePronunciations(wod),
  };
}

export const GUEST_WORDS: WordOfTheDayGuestWord[] = [
  {
    id: 'guest-articulate',
    word: 'articulate',
    meaning: 'express ideas clearly and fluently, especially in speaking',
    example: 'In Speaking Part 3 you must articulate complex opinions with confidence.',
    synonyms: ['express', 'voice', 'enunciate'],
    interest: 'Describe articulate speakers to impress examiners and show command over precision language.',
    partOfSpeech: 'verb',
    categories: ['Speaking', 'Communication'],
    pronunciations: [
      { ipa: '/ɑrˈtɪkjələt/', locale: 'en-US', label: 'American' },
      { ipa: '/ɑːˈtɪkjʊlənt/', locale: 'en-GB', label: 'British' },
    ],
    source: 'guest-sampler',
  },
  {
    id: 'guest-meticulous',
    word: 'meticulous',
    meaning: 'showing great attention to detail; very careful and precise',
    example: 'Her meticulous notes helped her spot patterns in IELTS Reading passages.',
    synonyms: ['thorough', 'careful', 'precise'],
    interest: 'Use it in Writing Task 2 when praising meticulous planning and structured arguments.',
    partOfSpeech: 'adjective',
    categories: ['Writing', 'Study habits'],
    pronunciations: [
      { ipa: '/məˈtɪkjələs/', locale: 'en-US', label: 'American' },
      { ipa: '/mɪˈtɪkjʊləs/', locale: 'en-GB', label: 'British' },
    ],
    source: 'guest-sampler',
  },
  {
    id: 'guest-resilient',
    word: 'resilient',
    meaning: 'able to recover quickly from difficulties and keep improving',
    example: 'Staying resilient after a tough mock test is crucial for long-term progress.',
    synonyms: ['tough', 'persistent', 'hardy'],
    interest: 'Perfect for Speaking stories about overcoming setbacks and persevering.',
    partOfSpeech: 'adjective',
    categories: ['Mindset', 'Motivation'],
    pronunciations: [
      { ipa: '/rɪˈzɪljənt/', locale: 'en-US', label: 'American' },
      { ipa: '/rɪˈzɪljənt/', locale: 'en-GB', label: 'British' },
    ],
    source: 'guest-sampler',
  },
];

export const FALLBACK_WORD: WordPayload = {
  id: 'guest-persevere',
  word: 'persevere',
  meaning: 'continue in a course of action even in the face of difficulty',
  example: 'Persevere through practice to reach Band 8+.',
  synonyms: ['persist', 'endure'],
  interest: 'Connect “persevere” with IELTS speaking by sharing persistence stories.',
  partOfSpeech: 'verb',
  categories: ['Mindset'],
  pronunciations: DEFAULT_PRONUNCIATIONS,
};

export const ZERO_STREAK = {
  learnedToday: false,
  streakDays: 0,
  longestStreak: 0,
  streakValueUSD: 0,
};

const globalState = globalThis as typeof globalThis & {
  __gramorGuestWordIndex?: number;
};

export function pickGuestWord(): WordPayload {
  if (GUEST_WORDS.length === 0) {
    return FALLBACK_WORD;
  }

  const lastIndex = typeof globalState.__gramorGuestWordIndex === 'number'
    ? globalState.__gramorGuestWordIndex
    : -1;

  let index = Math.floor(Math.random() * GUEST_WORDS.length);
  if (index === lastIndex) {
    index = (index + 1) % GUEST_WORDS.length;
  }

  globalState.__gramorGuestWordIndex = index;
  return GUEST_WORDS[index];
}

export async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : '';

  if (bearer) {
    const { data: userRes } = await supabaseAdmin.auth.getUser(bearer);
    return userRes?.user?.id ?? null;
  }

  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

