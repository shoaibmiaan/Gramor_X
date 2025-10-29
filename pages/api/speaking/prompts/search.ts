import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import type { PromptRecord, PromptSearchResponse } from '@/types/speakingPrompts';

const PARTS = ['p1', 'p2', 'p3', 'interview', 'scenario'] as const;
const LEVELS = ['B1', 'B2', 'C1', 'C2'] as const;

type NormalisedQuery = Record<string, string>;

function normaliseQuery(query: NextApiRequest['query']): NormalisedQuery {
  const result: NormalisedQuery = {};
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value[0];
    } else if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

const QuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  part: z.enum(PARTS).optional(),
  tags: z.string().trim().optional(),
  difficulty: z.enum(LEVELS).optional(),
  locale: z.string().trim().max(10).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  bookmarked: z
    .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => (value ? value === '1' || value === 'true' : false)),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<PromptSearchResponse | { error: string; details?: unknown }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = QuerySchema.safeParse(normaliseQuery(req.query));
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });
  }

  const { q, part, tags, difficulty, locale, page, pageSize, bookmarked } = parse.data;
  const supabase = getServerClient(req, res);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const savedIds = new Set<string>();
  if (user) {
    const { data: saves, error: savesError } = await supabase
      .from('speaking_prompt_saves')
      .select('prompt_id, is_bookmarked')
      .eq('user_id', user.id);

    if (savesError) {
      return res.status(500).json({ error: savesError.message });
    }

    (saves ?? []).forEach((row) => {
      if (row.is_bookmarked) savedIds.add(row.prompt_id);
    });
  }

  if (bookmarked && !user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (bookmarked && user && savedIds.size === 0) {
    return res.status(200).json({ items: [], page, pageSize, total: 0 });
  }

  let queryBuilder = supabase
    .from('speaking_prompts')
    .select('id, slug, part, topic, question, cue_card, followups, difficulty, locale, tags, is_active, created_at', {
      count: 'exact',
    })
    .eq('is_active', true);

  if (part) {
    queryBuilder = queryBuilder.eq('part', part);
  }

  if (difficulty) {
    queryBuilder = queryBuilder.eq('difficulty', difficulty);
  }

  if (locale) {
    queryBuilder = queryBuilder.eq('locale', locale);
  }

  if (q) {
    const sanitized = q.replace(/[,%]/g, '').trim();
    if (sanitized) {
      const term = `%${sanitized}%`;
      queryBuilder = queryBuilder.or(`topic.ilike.${term},question.ilike.${term},cue_card.ilike.${term}`);
    }
  }

  if (tags) {
    const tagList = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    for (const tag of tagList) {
      queryBuilder = queryBuilder.contains('tags', [tag]);
    }
  }

  if (bookmarked && user && savedIds.size > 0) {
    queryBuilder = queryBuilder.in('id', Array.from(savedIds));
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await queryBuilder
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const items: PromptRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    part: row.part as PromptRecord['part'],
    topic: row.topic,
    question: row.question ?? null,
    cueCard: row.cue_card ?? null,
    followups: Array.isArray(row.followups) ? row.followups : [],
    difficulty: row.difficulty as PromptRecord['difficulty'],
    locale: row.locale,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isActive: row.is_active,
    createdAt: row.created_at,
    bookmarked: savedIds.has(row.id),
  }));

  return res.status(200).json({
    items,
    page,
    pageSize,
    total: count ?? items.length,
  });
}
