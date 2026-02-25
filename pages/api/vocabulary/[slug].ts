import type { NextApiRequest, NextApiResponse } from 'next';

import { getWordDetail } from '@/lib/vocabulary/data';
import type { WordDetailResponse } from '@/types/vocabulary';

const getSlug = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<WordDetailResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const slug = getSlug(req.query.slug);

  if (!slug) {
    res.status(400).json({ error: 'Missing vocabulary slug' });
    return;
  }

  try {
    const detail = getWordDetail(slug);
    if (!detail) {
      res.status(404).json({ error: 'Vocabulary entry not found' });
      return;
    }

    res.status(200).json({ item: detail });
  } catch (error) {
    res.status(500).json({ error: (error as Error)?.message ?? 'Failed to load vocabulary.' });
  }
}
