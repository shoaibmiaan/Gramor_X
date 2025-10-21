import type { NextApiRequest, NextApiResponse } from 'next';

import { queryVocabulary } from '@/lib/vocabulary/data';
import type { PaginatedVocabularyResponse, WordSummary } from '@/types/vocabulary';

const getQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const parseLimit = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedVocabularyResponse<WordSummary> | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const search = getQueryValue(req.query.q);
    const cursor = getQueryValue(req.query.cursor);
    const partOfSpeech = getQueryValue(req.query.pos);
    const level = getQueryValue(req.query.level);
    const category = getQueryValue(req.query.category);
    const limit = parseLimit(getQueryValue(req.query.limit));

    const result = queryVocabulary({
      cursor: cursor ?? null,
      limit,
      search: search ?? undefined,
      partOfSpeech: partOfSpeech ?? undefined,
      level: level ?? undefined,
      category: category ?? undefined,
    });

    res.status(200).json({
      items: result.items,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error)?.message ?? 'Failed to load vocabulary.' });
  }
}
