import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import type { PromptRecord } from '@/types/speakingPrompts';

const PARTS = ['p1', 'p2', 'p3', 'interview', 'scenario'] as const;
const LEVELS = ['B1', 'B2', 'C1', 'C2'] as const;

const QuerySchema = z.object({
  part: z.enum(PARTS).optional(),
  difficulty: z.enum(LEVELS).optional(),
  tag: z.string().trim().optional(),
  locale: z.string().trim().max(10).optional(),
});

function normalise(query: NextApiRequest['query']) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value[0];
    } else if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

type ResponseBody = { item: PromptRecord | null } | { error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = QuerySchema.safeParse(normalise(req.query));
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });
  }

  const { part, difficulty, tag, locale } = parse.data;
  const supabase = getServerClient(req, res);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const bookmarkedIds = new Set<string>();
  if (user) {
    const { data: saves } = await supabase
      .from('speaking_prompt_saves')
      .select('prompt_id, is_bookmarked')
      .eq('user_id', user.id);

    (saves ?? []).forEach((row) => {
      if (row.is_bookmarked) bookmarkedIds.add(row.prompt_id);
    });
  }

  let queryBuilder = supabase
    .from('speaking_prompts')
    .select('id, slug, part, topic, question, cue_card, followups, difficulty, locale, tags, is_active, created_at')
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

  if (tag) {
    queryBuilder = queryBuilder.contains('tags', [tag]);
  }

  const { data, error } = await queryBuilder.limit(100);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(200).json({ item: null });
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  const row = data[randomIndex];
  const item: PromptRecord = {
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
    bookmarked: bookmarkedIds.has(row.id),
  };

  return res.status(200).json({ item });
}
