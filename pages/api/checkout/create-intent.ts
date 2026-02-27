import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { z } from 'zod';

const Body = z.object({
  planId: z.enum(['starter','booster','master']),
  currency: z.string().default('USD'),
  promoCode: z.string().trim().optional(),
  referralCode: z.string().trim().optional()
});

const BASE_PRICES: Record<string, number> = {
  starter: 9900,  // cents
  booster: 19900,
  master: 29900
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });

  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { planId, currency, promoCode, referralCode } = parse.data;
  let amount = BASE_PRICES[planId];

  // Validate promo (non-stacking default; choose the better)
  let applied: 'promo' | 'referral' | null = null;

  if (promoCode) {
    const r = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/promo/verify?code=${encodeURIComponent(promoCode)}&planId=${planId}&currency=${currency}`)
      .then(r => r.json()).catch(() => ({ valid: false }));
    if (r.valid) {
      applied = 'promo';
      if (r.type === 'percent') amount = Math.max(0, Math.round(amount * (1 - Number(r.value) / 100)));
      if (r.type === 'fixed') amount = Math.max(0, amount - Number(r.value));
    }
  }

  if (!applied && referralCode) {
    const r = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/referrals/verify?code=${encodeURIComponent(referralCode)}&planId=${planId}`)
      .then(r => r.json()).catch(() => ({ valid: false }));
    if (r.valid) {
      applied = 'referral';
      amount = Math.max(0, amount - Number(r.credit_cents ?? 0));
    }
  }

  // TODO Step 2: create Stripe/Safepay intent, persist payment_intents row
  return res.status(200).json({
    ok: true,
    planId,
    currency,
    amount_cents: amount,
    applied
  });
}
