import type { NextApiRequest, NextApiResponse } from 'next';

import { getVocabularyHighlights } from '@/lib/vocabulary/data';
import type { VocabularyHighlightsResponse } from '@/types/vocabulary';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<VocabularyHighlightsResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const highlights = getVocabularyHighlights();
  return res.status(200).json({ highlights });
}
