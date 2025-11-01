// pages/api/promotions/[code].ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { getAdminPromoByCode } from '@/lib/promotions/dynamic';
import { normalizePromoCode, type PromoCodeRule } from '@/lib/promotions/codes';

export type PromoResponse =
  | { ok: true; data: PromoCodeRule }
  | { ok: false; error: 'NOT_FOUND' | 'BAD_CODE' | 'SERVER_ERROR' };

export default async function handler(req: NextApiRequest, res: NextApiResponse<PromoResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'SERVER_ERROR' });
  }

  const codeParam = typeof req.query.code === 'string' ? req.query.code : req.query.code?.[0];
  if (!codeParam) {
    return res.status(400).json({ ok: false, error: 'BAD_CODE' });
  }

  const normalized = normalizePromoCode(codeParam);
  if (!normalized) {
    return res.status(400).json({ ok: false, error: 'BAD_CODE' });
  }

  try {
    const rule = await getAdminPromoByCode(normalized);
    if (!rule) {
      return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }
    return res.status(200).json({ ok: true, data: rule });
  } catch {
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}
