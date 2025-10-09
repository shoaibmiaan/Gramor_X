import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

type DbRow = {
  slug: string;
  title: string | null;
  summary: string | null;
  difficulty: string | null;
  words: number | null;
  duration_minutes: number | null;
  reading_questions?: Array<{ count: number | null }> | null;
};

type CatalogItem = {
  slug: string;
  title: string;
  summary?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  qCount: number;
  estMinutes: number;
};

function difficultyLabel(input: string | null | undefined): CatalogItem['difficulty'] {
  const value = (input ?? '').toLowerCase();
  if (value.includes('easy')) return 'Easy';
  if (value.includes('hard')) return 'Hard';
  return 'Medium';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ items: CatalogItem[] } | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data, error } = await supabaseAdmin
    .from<DbRow>('reading_tests')
    .select('slug,title,summary,difficulty,words,duration_minutes,reading_questions(count)')
    .eq('published', true)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message || 'Failed to load reading catalog' });
  }

  const items: CatalogItem[] = (data ?? []).map((row) => {
    const qCount = Array.isArray(row.reading_questions) && row.reading_questions.length > 0
      ? Number(row.reading_questions[0]?.count ?? 0)
      : 0;

    return {
      slug: row.slug,
      title: row.title ?? 'Reading Passage',
      summary: row.summary,
      difficulty: difficultyLabel(row.difficulty),
      qCount,
      estMinutes: typeof row.duration_minutes === 'number' ? row.duration_minutes : Math.max(10, Math.round((row.words ?? 900) / 50)),
    };
  });

  return res.status(200).json({ items });
}
