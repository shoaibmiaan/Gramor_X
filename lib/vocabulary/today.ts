import { DateTime } from 'luxon';
import { z } from 'zod';

import { supabaseService } from '@/lib/supabaseServer';
import { ACTIVE_LEARNING_TIMEZONE, getActiveDayISO } from '@/lib/daily-learning-time';

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

const WordRowSchema = z
  .object({
    word_date: z.string().min(4),
    id: z.string(),
    headword: z.string().min(1),
    definition: z.string().nullish(),
    meaning: z.string().nullish(),
    example: z.string().nullish(),
    example_sentence: z.string().nullish(),
    example_translation: z.string().nullish(),
    pos: z.string().nullish(),
    part_of_speech: z.string().nullish(),
    register: z.string().nullish(),
    cefr: z.string().nullish(),
    ipa: z.string().nullish(),
    audio_url: z.union([z.string(), z.record(z.string(), z.any())]).nullish(),
    synonyms: z.array(z.string()).nullish(),
    ielts_topics: z.array(z.string()).nullish(),
  })
  .passthrough();

const VocabWordSchema = WordRowSchema.extend({
  word_date: z.string().nullish(),
});

export type WordOfDay = {
  id: string;
  headword: string;
  definition: string;
  meaning: string;
  example: string | null;
  exampleTranslation: string | null;
  partOfSpeech: string | null;
  register: string | null;
  cefr: string | null;
  ipa: string | null;
  audioUrl: string | null;
  synonyms: string[];
  topics: string[];
};

export type WordOfDayResult = {
  wordDate: string;
  word: WordOfDay;
  source: 'rpc' | 'view';
};

function normaliseText(value: string | null | undefined) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normaliseNullable(value: string | null | undefined) {
  const text = normaliseText(value);
  return text.length > 0 ? text : null;
}

function normaliseSynonyms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<string>();
  raw.forEach((entry) => {
    if (typeof entry === 'string') {
      const cleaned = entry.trim();
      if (cleaned) set.add(cleaned);
    }
  });
  return Array.from(set);
}

function pickAudioUrl(input: unknown): string | null {
  if (typeof input === 'string' && input.trim().startsWith('http')) {
    return input.trim();
  }
  if (input && typeof input === 'object') {
    const values = Object.values(input as Record<string, unknown>);
    for (const value of values) {
      if (typeof value === 'string' && value.trim().startsWith('http')) {
        return value.trim();
      }
    }
  }
  return null;
}

function normaliseTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const topics = raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return topics.length > 0 ? Array.from(new Set(topics)) : [];
}

export async function getWordOfDay(dateISO?: string): Promise<WordOfDayResult | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const svc = supabaseService();
  const targetDate = dateISO || getActiveDayISO();

  const { data: rpcData, error: rpcError } = await svc.rpc('get_word_of_day_v2', {
    p_date: dateISO ?? null,
  });

  let row: unknown = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;
  let source: 'rpc' | 'view' = 'rpc';

  if ((!row || rpcError) && !dateISO) {
    const today = DateTime.now().setZone(ACTIVE_LEARNING_TIMEZONE).toISODate();
    const { data: fallbackData, error: fallbackError } = await svc
      .from('word_of_day_v')
      .select('*')
      .eq('word_date', today ?? targetDate)
      .order('word_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallbackError && fallbackData) {
      row = fallbackData;
      source = 'view';
    }
  }

  if (!row) {
    return null;
  }

  const parsed = WordRowSchema.safeParse(row);
  if (!parsed.success) {
    console.warn('[vocabulary/getWordOfDay] failed to parse row', parsed.error.flatten());
    return null;
  }

  const data = parsed.data;
  const meaning = normaliseText(data.meaning) || normaliseText(data.definition);
  if (!meaning) {
    return null;
  }

  const example = normaliseNullable(data.example) ?? normaliseNullable(data.example_sentence);
  const partOfSpeech = normaliseNullable(data.part_of_speech ?? data.pos);

  return {
    wordDate: data.word_date || targetDate,
    source,
    word: {
      id: data.id,
      headword: normaliseText(data.headword) || 'Unknown',
      definition: normaliseText(data.definition) || meaning,
      meaning,
      example,
      exampleTranslation: normaliseNullable(data.example_translation),
      partOfSpeech,
      register: normaliseNullable(data.register),
      cefr: normaliseNullable(data.cefr),
      ipa: normaliseNullable(data.ipa),
      audioUrl: pickAudioUrl(data.audio_url),
      synonyms: normaliseSynonyms(data.synonyms),
      topics: normaliseTopics(data.ielts_topics),
    },
  };
}

export async function getVocabWordById(wordId: string): Promise<WordOfDay | null> {
  if (!wordId) return null;
  if (!hasSupabaseConfig()) return null;

  const svc = supabaseService();

  const { data, error } = await svc
    .from('vocab_words')
    .select('*')
    .eq('id', wordId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Fallback to legacy words table if vocab_words is not populated yet
    const { data: legacy, error: legacyError } = await svc
      .from('words')
      .select('*')
      .eq('id', wordId)
      .limit(1)
      .maybeSingle();

    if (legacyError || !legacy) {
      return null;
    }

    return normaliseWordRecord(legacy);
  }

  return normaliseWordRecord(data);
}

function normaliseWordRecord(row: unknown): WordOfDay | null {
  const parsed = VocabWordSchema.safeParse(row);
  if (!parsed.success) {
    console.warn('[vocabulary/getVocabWordById] parse failure', parsed.error.flatten());
    return null;
  }

  const data = parsed.data;
  const meaning = normaliseText(data.meaning) || normaliseText(data.definition);
  if (!meaning) return null;

  const example = normaliseNullable(data.example) ?? normaliseNullable(data.example_sentence);
  const partOfSpeech = normaliseNullable(data.part_of_speech ?? data.pos);

  return {
    id: data.id,
    headword: normaliseText(data.headword) || 'Unknown',
    definition: normaliseText(data.definition) || meaning,
    meaning,
    example,
    exampleTranslation: normaliseNullable(data.example_translation),
    partOfSpeech,
    register: normaliseNullable(data.register),
    cefr: normaliseNullable(data.cefr),
    ipa: normaliseNullable(data.ipa),
    audioUrl: pickAudioUrl(data.audio_url),
    synonyms: normaliseSynonyms(data.synonyms),
    topics: normaliseTopics(data.ielts_topics),
  };
}
