import type { NextApiRequest, NextApiResponse } from 'next';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readingPracticePapers } from '@/data/reading';

const KIND_VALUES = ['tfng', 'mcq', 'matching', 'short'] as const;
type Kind = (typeof KIND_VALUES)[number];

type DbRow = {
  slug: string;
  title: string | null;
  summary: string | null;
  difficulty: string | null;
  words: number | null;
  duration_minutes: number | null;
  reading_questions?: Array<{ kind: string | null }> | null;
};

type CatalogItem = {
  slug: string;
  title: string;
  summary?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  qCount: number;
  estMinutes: number;
  types: Kind[];
};

const KIND_SET = new Set<string>(KIND_VALUES);

function getSupabaseAdmin(): SupabaseClient | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { supabaseAdmin } = require('@/lib/supabaseAdmin');
    return supabaseAdmin as SupabaseClient;
  } catch (error) {
    console.warn('[reading/tests] Falling back to static catalog. Supabase unavailable.', error);
    return null;
  }
}

function difficultyLabel(input: string | null | undefined): CatalogItem['difficulty'] {
  const value = (input ?? '').toLowerCase();
  if (value.includes('easy')) return 'Easy';
  if (value.includes('hard')) return 'Hard';
  return 'Medium';
}

function normaliseKind(value: string | null | undefined): Kind | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === 'match' || lower.startsWith('matching')) return 'matching';
  if (lower === 'ynng') return 'tfng';
  if (lower.startsWith('tfng')) return 'tfng';
  if (lower.startsWith('mcq')) return 'mcq';
  if (lower.startsWith('short')) return 'short';
  if (lower === 'gap' || lower.includes('fill')) return 'short';
  return KIND_SET.has(lower) ? (lower as Kind) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ items: CatalogItem[] } | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = getSupabaseAdmin();
  if (client) {
    try {
      const { data, error } = await client
        .from<DbRow>('reading_tests')
        .select('slug,title,summary,difficulty,words,duration_minutes,reading_questions(kind)')
        .eq('published', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[reading/tests] Supabase query failed, reverting to static data.', error);
      } else if (data && data.length > 0) {
        const items: CatalogItem[] = data.map((row) => {
          const questions = Array.isArray(row.reading_questions) ? row.reading_questions : [];
          const typeSet = new Set<Kind>();

          questions.forEach((q) => {
            const mapped = normaliseKind(q?.kind ?? null);
            if (mapped) typeSet.add(mapped);
          });

          const types = Array.from(typeSet);
          const qCount = questions.length;
          const estMinutes =
            typeof row.duration_minutes === 'number'
              ? row.duration_minutes
              : Math.max(10, Math.round((row.words ?? 900) / 50));

          return {
            slug: row.slug,
            title: row.title ?? 'Reading Passage',
            summary: row.summary,
            difficulty: difficultyLabel(row.difficulty),
            qCount,
            estMinutes,
            types: types.length > 0 ? types : (['mcq'] as Kind[]),
          };
        });

        return res.status(200).json({ items });
      }
    } catch (error) {
      console.warn('[reading/tests] Unexpected Supabase failure, reverting to static data.', error);
    }
  }

  const fallbackItems: CatalogItem[] = readingPracticePapers.map((paper) => {
    const passages = Array.isArray(paper.passages) ? paper.passages : [];
    const typeSet = new Set<Kind>();
    let totalQuestions = 0;

    passages.forEach((passage) => {
      const questions = Array.isArray(passage.questions) ? passage.questions : [];
      questions.forEach((question) => {
        const mapped = normaliseKind(
          typeof question?.type === 'string' ? question.type : null,
        );
        if (mapped) typeSet.add(mapped);
      });
      totalQuestions += questions.length;
    });

    const estMinutes = Math.max(10, Math.round((paper.durationSec ?? 3600) / 60));
    const qCount = totalQuestions;
    const types = typeSet.size > 0 ? Array.from(typeSet) : (['mcq'] as Kind[]);

    const difficulty: CatalogItem['difficulty'] = qCount >= 38 ? 'Hard' : qCount >= 26 ? 'Medium' : 'Easy';

    return {
      slug: paper.id,
      title: paper.title ?? paper.id,
      summary: null,
      difficulty,
      qCount,
      estMinutes,
      types,
    };
  });

  return res.status(200).json({ items: fallbackItems });
}
