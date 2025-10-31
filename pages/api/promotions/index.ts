// pages/api/promotions/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { listActiveAdminPromos } from '@/lib/promotions/dynamic';
import type { PromoCodeRule } from '@/lib/promotions/codes';

export type PromoListResponse = { ok: true; data: PromoCodeRule[] } | { ok: false; error: 'SERVER_ERROR' };

export default async function handler(req: NextApiRequest, res: NextApiResponse<PromoListResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'SERVER_ERROR' });
  }

  try {
    const data = await listActiveAdminPromos();
    return res.status(200).json({ ok: true, data });
  } catch {
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}
