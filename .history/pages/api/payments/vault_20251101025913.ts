import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import Stripe from 'stripe';
import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  payment_method_id: z.string(),
  provider: z.enum(['stripe']).optional().default('stripe'),
});

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_body', details: parse.error.flatten() });

  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  if (!stripe) {
    // If Stripe is not configured in dev, optionally simulate/store a sandbox token
    return res.status(503).json({ error: 'stripe_not_configured' });
  }

  const pmId = parse.data.payment_method_id;

  try {
    // 1) create or lookup a customer for your user (use metadata to link)
    // You may keep a mapping table user->customer_id in your DB; for simplicity we create if none.
    // Try to find an existing customer with metadata (or your own customers table)
    // For demo, create a new customer:
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { gramorx_user_id: user.id },
    });

    // 2) attach the payment method to the customer (vault it)
    await stripe.paymentMethods.attach(pmId, { customer: customer.id });

    // 3) optionally set as default payment method
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pmId } });

    // 4) fetch PM details (masked)
    const pm = await stripe.paymentMethods.retrieve(pmId) as Stripe.PaymentMethod;

    const card = (pm.card ?? null) as Stripe.PaymentMethod.Card | null;

    // 5) save vaulted record (only masked data) in your DB
    const { data: saved, error } = await supabase
      .from('payment_methods_vault')
      .insert([{
        user_id: user.id,
        provider: 'stripe',
        customer_id: customer.id,
        payment_method_id: pm.id,
        card_brand: card?.brand ?? null,
        card_last4: card?.last4 ?? null,
        exp_month: card?.exp_month ?? null,
        exp_year: card?.exp_year ?? null,
        status: 'vaulted',
        metadata: { pm_type: pm.type },
      }])
      .select('*')
      .single();

    if (error) {
      // If DB insert fails, detach the payment method to avoid orphaned vaults
      try { await stripe.paymentMethods.detach(pm.id); } catch (e) { console.error('detach failed', e); }
      console.error('[vault] db insert failed', error);
      return res.status(500).json({ error: 'vault_db_failed' });
    }

    // 6) Also create a payment_intent row (pending) to show in user's account
    const { data: intent, error: intentErr } = await supabase
      .from('payment_intents')
      .insert([{
        user_id: user.id,
        plan_id: 'booster',    // or pass from client
        cycle: 'monthly',
        provider: 'stripe',
        amount_cents: 1900,
        currency: 'USD',
        status: 'pending',
        metadata: { vault_id: saved.id },
      }])
      .select('id')
      .single();

    if (intentErr) console.warn('[vault] created vault but failed to create payment_intent', intentErr);

    // Return masked info to the client for UI
    return res.status(200).json({
      ok: true,
      vault: {
        id: saved.id,
        card_brand: saved.card_brand,
        card_last4: saved.card_last4,
        exp_month: saved.exp_month,
        exp_year: saved.exp_year,
      },
      intent_id: intent?.id ?? null,
      message: 'Card saved. Membership active — payment pending.',
    });
  } catch (e: any) {
    console.error('vault error', e);
    return res.status(500).json({ error: 'vault_failed', details: e?.message });
  }
}
