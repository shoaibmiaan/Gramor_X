import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  FALLBACK_WORD,
  GUEST_WORDS,
  normaliseWordPayload,
  pickGuestWord,
  resolveUserId,
  type WordPayload,
} from '@/lib/vocabulary/word-shared';

export type LearnedWord = WordPayload & {
  learnedOn: string;
};

export type LearnedResponse = {
  words: LearnedWord[];
  total: number;
  guest: boolean;
};

const FALLBACK_LEARNED: LearnedWord[] = GUEST_WORDS.slice(0, 3).map((word, index) => ({
  ...word,
  learnedOn: new Date(Date.now() - index * 86400000).toISOString(),
}));

function ensureIsoDate(value: unknown): string {
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date().toISOString();
}

function mapWord(row: Record<string, unknown> | null | undefined): WordPayload {
  const fallback = FALLBACK_WORD;
  return normaliseWordPayload(row ?? {}, fallback);
}

function extractWord(row: Record<string, unknown>): LearnedWord {
  const learnedOn = ensureIsoDate(row.learned_on ?? row.learnedOn ?? new Date());
  const wordRaw = (row.word ?? row.word_id ?? row.wordId) as Record<string, unknown> | null | undefined;
  const word = mapWord(wordRaw ?? row);
  return { ...word, learnedOn };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LearnedResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ words: [], total: 0, guest: true });
  }

  try {
    const userId = await resolveUserId(req, res);
    if (!userId) {
      const guestWord = pickGuestWord();
      const rotation = [guestWord, ...FALLBACK_LEARNED.filter((word) => word.id !== guestWord.id)];
      return res.status(200).json({
        words: rotation.slice(0, 5),
        total: rotation.length >= 5 ? 5 : rotation.length,
        guest: true,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('user_word_logs')
      .select(
        `learned_on,
         word:word_id (
           id,
           word,
           meaning,
           example,
           synonyms,
           interest_hook,
           part_of_speech,
           pos,
           categories,
           pronunciations,
           ipa_us,
           ipa_uk,
           audio_us,
           audio_uk,
           pronunciation_ipa_us,
           pronunciation_audio_us,
           pronunciation_ipa_uk,
           pronunciation_audio_uk
         )`
      )
      .eq('user_id', userId)
      .order('learned_on', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('[api/words/learned] fallback due to error', error);
      return res.status(200).json({ words: FALLBACK_LEARNED, total: FALLBACK_LEARNED.length, guest: true });
    }

    const words = Array.isArray(data)
      ? data
          .map((row) => (row && typeof row === 'object' ? extractWord(row as Record<string, unknown>) : null))
          .filter((value): value is LearnedWord => Boolean(value))
      : [];

    return res.status(200).json({ words, total: words.length, guest: false });
  } catch (error) {
    console.error('[api/words/learned] unexpected error', error);
    return res.status(200).json({ words: FALLBACK_LEARNED, total: FALLBACK_LEARNED.length, guest: true });
  }
}
