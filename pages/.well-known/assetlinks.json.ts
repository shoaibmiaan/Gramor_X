// pages/.well-known/assetlinks.json.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { ANDROID_ASSET_LINKS } from '@/data/mobile/deeplinks';

export const ASSET_LINK_STATEMENTS = ANDROID_ASSET_LINKS;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'HEAD') {
    res.setHeader(
      'Cache-Control',
      'public, max-age=900, s-maxage=86400, stale-while-revalidate=604800',
    );
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  res.setHeader(
    'Cache-Control',
    'public, max-age=900, s-maxage=86400, stale-while-revalidate=604800',
  );
  res.status(200).json(ASSET_LINK_STATEMENTS);
}

