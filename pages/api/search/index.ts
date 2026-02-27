// pages/api/search/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { searchContent } from '@/lib/search/engine';
import type { SearchErrorResponse, SearchResponse } from '@/lib/search/types';

type Response = SearchResponse | SearchErrorResponse;

export default function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const qParam = req.query.q;
  const limitParam = req.query.limit;

  const query = typeof qParam === 'string' ? qParam : Array.isArray(qParam) ? qParam[0] ?? '' : '';
  const limitRaw =
    typeof limitParam === 'string'
      ? limitParam
      : Array.isArray(limitParam)
        ? limitParam[0]
        : undefined;

  const limit = (() => {
    const parsed = Number(limitRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, 50);
    }
    return 20;
  })();

  try {
    const results = searchContent(query ?? '', limit);
    return res.status(200).json({ query: query ?? '', results });
  } catch (err) {
    console.error('[api/search] failed to respond', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

