import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

// IMPORTANT: match the actual export. If you're unsure, guard it.
// If your lib really exports `getNotificationContact`, keep as-is.
// If it exports `getNotificationContactByUser` or default, update accordingly.
import * as Notify from '@/lib/notify'; // we’ll resolve the function at runtime

// ---------- Types ----------
const Body = z.object({
  plan: z.enum(['starter', 'booster', 'master']),
  cycle: z.enum(['monthly', 'annual']),
  currency: z.string().default('PKR'), // enforce what you support; PKR by default
});

type Provider = 'safepay';

type PaymentIntentRow = {
  id?: string;
  user_id: string;
  provider: Provider;
  reference: string;
  plan: 'starter' | 'booster' | 'master';
  cycle: 'monthly' | 'annual';
  currency: string;            // 'PKR' | 'USD' | 'GBP' etc.
  amount_minor: number;        // cents/paisa
  status: 'pending' | 'succeeded' | 'failed';
  provider_session_id?: string | null;
  provider_receipt_url?: string | null;
  created_at?: string;
  paid_at?: string | null;
};

// ---------- Helpers ----------
const amountFor = (plan: PaymentIntentRow['plan'], cycle: PaymentIntentRow['cycle']): number => {
  // TODO: wire to your canonical pricing calc
  // For demo: booster monthly = Rs 19.00 (1900 paisa), adjust as needed
  if (cycle === 'monthly') {
    if (plan === 'starter') return 900;   // Rs 9.00
    if (plan === 'booster') return 1900;  // Rs 19.00
    if (plan === 'master')  return 3900;  // Rs 39.00
  } else {
    if (plan === 'starter') return 96000; // Rs 960.00 (12×80)
    if (plan === 'booster') return 192000;
    if (plan === 'master')  return 420000;
  }
  return 1900;
};

const buildSafepayComponentsUrl = (opts: {
  reference: string;
  returnUrl: string;
  cancelUrl: string;
  env: 'sandbox' | 'production';
}) => {
  const base =
    opts.env === 'production'
      ? 'https://api.getsafepay.com/components'
      : 'https://sandbox.api.getsafepay.com/components';
  const q = new URLSearchParams({
    env: opts.env,
    reference: opts.reference,
    return_url: opts.returnUrl,
    cancel_url: opts.cancelUrl,
  });
  return `${base}?${q.toString()}`;
};

// best effort lookup; won’t crash if the export name differs
const getNotificationContact =
  // @ts-expect-error TODO: tighten typing once lib/notify export is finalized
  (Notify.getNotificationContact ||
   // @ts-expect-error
   Notify.getNotificationContactByUser ||
   // @ts-expect-error
   Notify.default ||
   null);

// ---------- Handler ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { plan, cycle, currency } = parse.data;

  // 1) Create our own intent
  const reference = `GXR-${Date.now()}`;
  const amount_minor = amountFor(plan, cycle);
  const provider: Provider = 'safepay';

  const { error: insertErr, data: inserted } = await supabase
    .from('payment_intents')
    .insert({
      user_id: user.id,
      provider,
      reference,
      plan,
      cycle,
      currency: currency.toUpperCase(),
      amount_minor,
      status: 'pending',
    } satisfies PaymentIntentRow)
    .select('id')
    .single();

  if (insertErr) {
    return res.status(500).json({ error: 'DB insert failed', details: insertErr.message });
  }

  // 2) Build redirect URL (server-side truth of return/cancel)
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (req.headers['x-forwarded-proto'] && req.headers.host
      ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
      : `https://${req.headers.host}`);

  const returnUrl = `${origin}/checkout/success?reference=${encodeURIComponent(reference)}`;
  const cancelUrl  = `${origin}/checkout/cancel?reference=${encodeURIComponent(reference)}`;

  const env = (process.env.SAFEPAY_ENV === 'production' ? 'production' : 'sandbox') as
    | 'sandbox'
    | 'production';

  // If you’re using Safepay Components you can redirect directly to this URL.
  // If you’re using their tokenization API first, call it here and replace with their checkout URL.
  const checkoutUrl = buildSafepayComponentsUrl({ reference, returnUrl, cancelUrl, env });

  // 3) Try to inform the user (non-blocking). DO NOT break the request on notification failure.
  (async () => {
    if (!getNotificationContact) return;
    try {
      const contact = await getNotificationContact(user.id);
      // @ts-expect-error implement your notify(event, contact, payload) in lib/notify
      await Notify.notify?.('payment_intent_created', contact, {
        provider,
        plan,
        cycle,
        currency,
        amount_minor,
        reference,
      });
    } catch (e) {
      // swallow — logging only
      console.warn('[payments] notify failed', e);
    }
  })();

  // 4) Respond to client
  return res.status(200).json({
    ok: true,
    provider,
    intentId: inserted?.id ?? null,
    reference,
    checkoutUrl,
  });
}
