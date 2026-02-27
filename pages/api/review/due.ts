import type { NextApiRequest, NextApiResponse } from 'next';

import { buildReadingMiniCloze } from '@/lib/skills/readingMiniCloze';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ReviewQueue } from '@/types/supabase';
import type {
  ReviewDueResponse,
  ReviewItemType,
  ReviewQueueEnvelope,
  SkillBundle,
  SkillKey,
  SkillMix,
} from '@/types/review';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_MIX: ReviewItemType[] = ['word', 'collocation', 'word', 'collocation', 'gap'];
const ALL_TYPES: ReviewItemType[] = ['word', 'collocation', 'gap'];
const DEFAULT_SKILLS: SkillKey[] = ['reading', 'listening', 'writing', 'speaking'];
const SKILL_MAP: Record<ReviewItemType, SkillKey> = {
  word: 'reading',
  collocation: 'speaking',
  gap: 'writing',
};
const SKILL_ORDER: SkillKey[] = ['reading', 'listening', 'writing', 'speaking'];
const DEFAULT_TOTAL_EXERCISES = 10;

function buildSkillBundle(options: {
  word: any | undefined;
  collocations: any[];
  examples: any[];
  stats: { pron_attempts?: number; writing_attempts?: number; reading_attempts?: number; listening_attempts?: number } | null;
  hasAudio: boolean;
}): SkillBundle | undefined {
  const { word, collocations, examples, stats, hasAudio } = options;
  if (!word) return undefined;

  const readingMiniCloze = buildReadingMiniCloze({ word, collocations, examples });
  if (!readingMiniCloze) return undefined;

  const { headword, topic, suggestedCollocations, passage, segments, blanks } = readingMiniCloze;

  const scenarios: string[] = [];
  scenarios.push(`Academic: explain a ${topic.toLowerCase()} trend using “${headword}”.`);
  scenarios.push(`Collocation focus: include “${suggestedCollocations[0]}” naturally.`);
  scenarios.push(
    examples[0]?.text
      ? `Remix this context: “${examples[0].text.replace(/"/g, '')}”`
      : `Personal: describe when you would rely on “${headword}”.`,
  );

  const statsSafe = stats ?? {};

  const bundle: SkillBundle = {
    writing: {
      prompt: `Write two sentences (1–2 each) using “${headword}” with a ${word.register ?? 'neutral'} tone.`,
      scenarios,
      suggestedCollocations,
      register: word.register ?? null,
      attempts: statsSafe.writing_attempts ?? 0,
    },
    reading: {
      passage,
      segments,
      blanks,
      attempts: statsSafe.reading_attempts ?? 0,
    },
    speaking: {
      attempts: statsSafe.pron_attempts ?? 0,
    },
    listening: {
      attempts: statsSafe.listening_attempts ?? 0,
      hasAudio,
    },
    totalExercises: DEFAULT_TOTAL_EXERCISES,
  };

  return bundle;
}

function parseMix(raw: string | string[] | undefined): ReviewItemType[] {
  if (!raw) return DEFAULT_MIX;

  const parts = (Array.isArray(raw) ? raw.join(',') : raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean) as string[];

  const mix = parts.filter((part): part is ReviewItemType =>
    ['word', 'collocation', 'gap'].includes(part as ReviewItemType),
  );

  return mix.length > 0 ? mix : DEFAULT_MIX;
}

function buildSkillMix(): SkillMix {
  return SKILL_ORDER.reduce<SkillMix>((acc, skill) => {
    acc[skill] = 0;
    return acc;
  }, {} as SkillMix);
}

type QueueSlice = Pick<ReviewQueue, 'item_type' | 'item_ref_id' | 'due_at' | 'priority'>;

function mixRoundRobin(
  itemsByType: Record<ReviewItemType, QueueSlice[]>,
  mix: ReviewItemType[],
  limit: number,
) {
  const working: Record<ReviewItemType, QueueSlice[]> = {
    word: [...(itemsByType.word ?? [])],
    collocation: [...(itemsByType.collocation ?? [])],
    gap: [...(itemsByType.gap ?? [])],
  };

  const sequence = mix.length > 0 ? mix : DEFAULT_MIX;
  const combined: QueueSlice[] = [];

  while (combined.length < limit) {
    let progressed = false;
    for (const type of sequence) {
      const bucket = working[type];
      if (bucket && bucket.length > 0) {
        combined.push(bucket.shift()!);
        progressed = true;
        if (combined.length >= limit) break;
      }
    }
    if (!progressed) break;
  }

  if (combined.length < limit) {
    for (const type of ALL_TYPES) {
      const bucket = working[type];
      while (bucket && bucket.length > 0 && combined.length < limit) {
        combined.push(bucket.shift()!);
      }
    }
  }

  return combined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ReviewDueResponse | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = Math.min(Math.max(parseInt(limitParam ?? '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const mixParam = parseMix(req.query.mix);
  const mixSequence = mixParam.length > 0 ? mixParam : DEFAULT_MIX;
  const typesToQuery = Array.from(new Set(mixSequence));

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const nowIso = new Date().toISOString();
  const totals: Record<ReviewItemType, number> = { word: 0, collocation: 0, gap: 0 };
  const skillMix = buildSkillMix();
  const itemsByType: Record<ReviewItemType, QueueSlice[]> = {
    word: [],
    collocation: [],
    gap: [],
  };

  for (const type of typesToQuery) {
    const { data, error, count } = await supabase
      .from('review_queue')
      .select('item_type, item_ref_id, due_at, priority', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('item_type', type)
      .lte('due_at', nowIso)
      .order('due_at', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[review/due] queue fetch error', error);
      return res.status(500).json({ error: 'Failed to load review queue' });
    }

    itemsByType[type] = data ?? [];
    totals[type] = count ?? 0;

    const skill = SKILL_MAP[type];
    skillMix[skill] = (skillMix[skill] ?? 0) + (count ?? 0);
  }

  const merged = mixRoundRobin(itemsByType, mixSequence, limit);

  const wordIds = Array.from(new Set(merged.filter((item) => item.item_type === 'word').map((item) => item.item_ref_id)));
  const collocationIds = Array.from(
    new Set(merged.filter((item) => item.item_type === 'collocation').map((item) => item.item_ref_id)),
  );
  const gapIds = Array.from(new Set(merged.filter((item) => item.item_type === 'gap').map((item) => item.item_ref_id)));

  const [wordsRes, collocationsRes, gapsRes, audioRes, prefsRes] = await Promise.all([
    wordIds.length
      ? supabase
          .from('words')
          .select('id, headword, definition, pos, register, cefr, ielts_topics')
          .in('id', wordIds)
      : Promise.resolve({ data: [], error: null }),
    collocationIds.length
      ? supabase
          .from('word_collocations')
          .select(
            'id, word_id, chunk, pattern, note, words!word_collocations_word_id_fkey(id, headword, definition, pos, ielts_topics)',
          )
          .in('id', collocationIds)
      : Promise.resolve({ data: [], error: null }),
    gapIds.length
      ? supabase
          .from('word_examples')
          .select(
            'id, word_id, text, source, is_gap_ready, ielts_topic, words!word_examples_word_id_fkey(id, headword, definition, pos, ielts_topics)',
          )
          .in('id', gapIds)
      : Promise.resolve({ data: [], error: null }),
    wordIds.length
      ? supabase
          .from('word_audio')
          .select('word_id, ipa, audio_url, tts_provider')
          .in('word_id', wordIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('user_prefs')
      .select('focus_skill, daily_quota_words')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  let collocationExamplesData: any[] = [];
  let collocationExamplesError: any = null;
  let exampleAudioRows: any[] = [];
  let exampleAudioError: any = null;

  if (!collocationsRes.error) {
    const collocationWordIds = Array.from(
      new Set((collocationsRes.data as any[])?.map((row) => row.word_id).filter(Boolean)),
    );

    if (collocationWordIds.length > 0) {
      const { data, error } = await supabase
        .from('word_examples')
        .select('id, word_id, text, ielts_topic')
        .eq('is_gap_ready', false)
        .in('word_id', collocationWordIds)
        .order('updated_at', { ascending: false });

      if (error) {
        collocationExamplesError = error;
      } else {
        collocationExamplesData = data ?? [];
      }
    }
  }

  const exampleAudioIds = new Set<string>();
  gapIds.forEach((id) => exampleAudioIds.add(id));
  collocationExamplesData.forEach((row) => {
    if (row?.id) exampleAudioIds.add(row.id);
  });

  if (exampleAudioIds.size > 0) {
    const { data, error } = await supabase
      .from('word_example_audio')
      .select('example_id, audio_url, tts_provider, voice')
      .in('example_id', Array.from(exampleAudioIds));

    if (error) {
      exampleAudioError = error;
    } else {
      exampleAudioRows = data ?? [];
    }
  }

  if (
    wordsRes.error ||
    collocationsRes.error ||
    gapsRes.error ||
    audioRes.error ||
    prefsRes.error ||
    collocationExamplesError ||
    exampleAudioError
  ) {
    console.error('[review/due] resource fetch error', {
      words: wordsRes.error,
      collocations: collocationsRes.error,
      gaps: gapsRes.error,
      audio: audioRes.error,
      prefs: prefsRes.error,
      collocationExamples: collocationExamplesError,
      exampleAudio: exampleAudioError,
    });
    return res.status(500).json({ error: 'Failed to load review cards' });
  }

  const wordMap = new Map<string, any>();
  (wordsRes.data as any[])?.forEach((row) => {
    wordMap.set(row.id, row);
  });

  const audioMap = new Map<string, any>();
  (audioRes.data as any[])?.forEach((row) => {
    audioMap.set(row.word_id, row);
  });

  const collocationMap = new Map<string, any>();
  (collocationsRes.data as any[])?.forEach((row) => {
    collocationMap.set(row.id, row);
  });

  const gapMap = new Map<string, any>();
  (gapsRes.data as any[])?.forEach((row) => {
    gapMap.set(row.id, row);
  });

  const collocationExamplesMap = new Map<string, any[]>();
  collocationExamplesData.forEach((row) => {
    const existing = collocationExamplesMap.get(row.word_id) ?? [];
    existing.push(row);
    collocationExamplesMap.set(row.word_id, existing);
  });

  const exampleAudioMap = new Map<string, any>();
  exampleAudioRows.forEach((row) => {
    exampleAudioMap.set(row.example_id, row);
  });

  const wordExamplesMap = new Map<string, any[]>();
  (gapsRes.data as any[])?.forEach((row) => {
    if (!row?.word_id) return;
    const existing = wordExamplesMap.get(row.word_id) ?? [];
    existing.push(row);
    wordExamplesMap.set(row.word_id, existing);
  });
  collocationExamplesData.forEach((row) => {
    if (!row?.word_id) return;
    const existing = wordExamplesMap.get(row.word_id) ?? [];
    existing.push(row);
    wordExamplesMap.set(row.word_id, existing);
  });

  const wordCollocationsMap = new Map<string, any[]>();
  (collocationsRes.data as any[])?.forEach((row) => {
    if (!row?.word_id) return;
    const existing = wordCollocationsMap.get(row.word_id) ?? [];
    existing.push(row);
    wordCollocationsMap.set(row.word_id, existing);
  });

  const contextWordIds = new Set<string>();
  wordMap.forEach((_, id) => contextWordIds.add(id));
  (collocationsRes.data as any[])?.forEach((row) => {
    if (row?.word_id) contextWordIds.add(row.word_id);
  });
  (gapsRes.data as any[])?.forEach((row) => {
    if (row?.word_id) contextWordIds.add(row.word_id);
  });

  const statsMap = new Map<string, any>();

  if (contextWordIds.size > 0) {
    const contextIds = Array.from(contextWordIds);
    const [collocExtraRes, examplesExtraRes, statsRes] = await Promise.all([
      supabase
        .from('word_collocations')
        .select('id, word_id, chunk, pattern, note')
        .in('word_id', contextIds),
      supabase
        .from('word_examples')
        .select('id, word_id, text, source, is_gap_ready, ielts_topic')
        .in('word_id', contextIds)
        .order('updated_at', { ascending: false })
        .limit(contextIds.length * 5),
      supabase
        .from('user_word_stats')
        .select('word_id, pron_attempts, writing_attempts, reading_attempts, listening_attempts')
        .eq('user_id', user.id)
        .in('word_id', contextIds),
    ]);

    if (collocExtraRes.error || examplesExtraRes.error || statsRes.error) {
      console.error('[review/due] enrichment fetch error', {
        collocations: collocExtraRes.error,
        examples: examplesExtraRes.error,
        stats: statsRes.error,
      });
      return res.status(500).json({ error: 'Failed to prepare skill bundle' });
    }

    (collocExtraRes.data as any[])?.forEach((row) => {
      if (!row?.word_id) return;
      const existing = wordCollocationsMap.get(row.word_id) ?? [];
      existing.push(row);
      wordCollocationsMap.set(row.word_id, existing);
    });

    (examplesExtraRes.data as any[])?.forEach((row) => {
      if (!row?.word_id) return;
      const existing = wordExamplesMap.get(row.word_id) ?? [];
      existing.push(row);
      wordExamplesMap.set(row.word_id, existing);
    });

    (statsRes.data as any[])?.forEach((row) => {
      if (!row?.word_id) return;
      statsMap.set(row.word_id, row);
    });
  }

  const items: ReviewQueueEnvelope[] = merged.map((entry) => {
    if (entry.item_type === 'word') {
      const word = wordMap.get(entry.item_ref_id);
      const audio = audioMap.get(entry.item_ref_id) ?? null;
      const skills = buildSkillBundle({
        word,
        collocations: wordCollocationsMap.get(entry.item_ref_id) ?? [],
        examples: wordExamplesMap.get(entry.item_ref_id) ?? [],
        stats: statsMap.get(entry.item_ref_id) ?? null,
        hasAudio: !!audio,
      });
      return {
        queue: entry,
        card: {
          type: 'word',
          word: word
            ? {
                ...word,
                audio,
              }
            : undefined,
          skills,
        },
      } satisfies ReviewQueueEnvelope;
    }

    if (entry.item_type === 'collocation') {
      const row = collocationMap.get(entry.item_ref_id);
      const exampleRows = row ? collocationExamplesMap.get(row.word_id) ?? [] : [];
      const wordId = row?.word_id ?? row?.words?.id;
      const collocationWord = row?.words ?? (wordId ? wordMap.get(wordId) : undefined);
      const skills = buildSkillBundle({
        word: collocationWord,
        collocations: wordCollocationsMap.get(wordId ?? '') ?? [],
        examples: wordExamplesMap.get(wordId ?? '') ?? [],
        stats: wordId ? statsMap.get(wordId) ?? null : null,
        hasAudio:
          !!collocationWord?.audio ||
          exampleRows.some((example: any) => !!exampleAudioMap.get(example.id)?.audio_url),
      });
      return {
        queue: entry,
        card: {
          type: 'collocation',
          collocation: row
            ? {
                id: row.id,
                word_id: row.word_id,
                chunk: row.chunk,
                pattern: row.pattern,
                note: row.note,
              }
            : undefined,
          word: row?.words ?? undefined,
          examples: exampleRows.slice(0, 3).map((example: any) => ({
            id: example.id,
            text: example.text,
            ielts_topic: example.ielts_topic ?? null,
            audio: (() => {
              const audioRow = exampleAudioMap.get(example.id);
              if (!audioRow) return null;
              return {
                audio_url: audioRow.audio_url ?? {},
                tts_provider: audioRow.tts_provider ?? null,
                voice: audioRow.voice ?? null,
              };
            })(),
          })),
          skills,
        },
      } satisfies ReviewQueueEnvelope;
    }

    const row = gapMap.get(entry.item_ref_id);
    const audioRow = exampleAudioMap.get(entry.item_ref_id);
    const wordId = row?.word_id ?? row?.words?.id;
    const gapWord = row?.words ?? (wordId ? wordMap.get(wordId) : undefined);
    const skills = buildSkillBundle({
      word: gapWord,
      collocations: wordCollocationsMap.get(wordId ?? '') ?? [],
      examples: wordExamplesMap.get(wordId ?? '') ?? [],
      stats: wordId ? statsMap.get(wordId) ?? null : null,
      hasAudio: !!audioRow,
    });
    return {
      queue: entry,
      card: {
        type: 'gap',
        example: row
          ? {
              id: row.id,
              word_id: row.word_id,
              text: row.text,
              is_gap_ready: row.is_gap_ready,
              source: row.source,
              ielts_topic: row.ielts_topic ?? null,
            }
          : undefined,
        word: row?.words ?? undefined,
        audio: audioRow
          ? {
              audio_url: audioRow.audio_url ?? {},
              tts_provider: audioRow.tts_provider ?? null,
              voice: audioRow.voice ?? null,
            }
          : null,
        skills,
      },
    } satisfies ReviewQueueEnvelope;
  });

  const prefs = prefsRes.data ?? { focus_skill: ['reading', 'listening', 'writing', 'speaking'], daily_quota_words: DEFAULT_LIMIT };

  const focusSkills = Array.isArray((prefs as any).focus_skill) && (prefs as any).focus_skill.length > 0
    ? ((prefs as any).focus_skill as SkillKey[])
    : DEFAULT_SKILLS;

  const dailyQuota = typeof (prefs as any).daily_quota_words === 'number'
    ? (prefs as any).daily_quota_words
    : DEFAULT_LIMIT;

  const response: ReviewDueResponse = {
    items,
    totals: {
      word: totals.word,
      collocation: totals.collocation,
      gap: totals.gap,
      overall: ALL_TYPES.reduce((sum, type) => sum + (totals[type] ?? 0), 0),
    },
    skillMix,
    focusSkills,
    dailyQuota,
    requestedMix: mixSequence,
  };

  return res.status(200).json(response);
}
