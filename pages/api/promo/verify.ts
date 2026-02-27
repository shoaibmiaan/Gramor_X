import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const Query = z.object({
  code: z.string().trim().toUpperCase(),
  planId: z.enum(['free','starter','booster','master']),
  currency: z.string().default('USD')
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const parse = Query.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });

  const { code, planId, currency } = parse.data;
  const supabase = getServerClient(req, res);

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!promo || promo.status !== 'active') return res.status(200).json({ valid: false });

  const now = new Date();
  if ((promo.valid_from && new Date(promo.valid_from) > now) || (promo.valid_to && new Date(promo.valid_to) < now)) {
    return res.status(200).json({ valid: false });
  }
  if (promo.max_redemptions && promo.redemptions >= promo.max_redemptions) {
    return res.status(200).json({ valid: false });
  }
  if (promo.allowed_plans?.length && !promo.allowed_plans.includes(planId)) {
    return res.status(200).json({ valid: false });
  }

  return res.status(200).json({
    valid: true,
    type: promo.type,
    value: promo.value,
    currency: promo.currency ?? currency,
    apply_cycles: promo.apply_cycles ?? 1
  });
}
