// pages/api/payments/vault.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import Stripe from 'stripe';
import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  payment_method_id: z.string(),
  plan: z.enum(['free','starter','booster','master']).default('starter'),
  cycle: z.enum(['monthly','yearly']).default('monthly'),
  billing_details: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.object({
      line1: z.string().optional(),
      city: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().length(2).optional(),
    }).optional(),
  }).optional(),
});

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null;

function amountFor(plan: 'free'|'starter'|'booster'|'master', cycle: 'monthly'|'yearly') {
  if (plan === 'starter') return cycle === 'monthly' ? 900 : 9000;
  if (plan === 'booster') return cycle === 'monthly' ? 1900 : 19000;
  if (plan === 'master')  return cycle === 'monthly' ? 3900 : 39000;
  return 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_body', details: parse.error.flatten() });

  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' });

  const { payment_method_id, plan, cycle, billing_details } = parse.data;

  try {
    // Customer (you can optimize by caching customer_id per user)
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: billing_details?.name,
      phone: billing_details?.phone,
      address: billing_details?.address
        ? {
            line1: billing_details.address.line1,
            city: billing_details.address.city,
            postal_code: billing_details.address.postal_code,
            country: billing_details.address.country,
          }
        : undefined,
      metadata: { gramorx_user_id: user.id },
    });

    // Attach PM
    await stripe.paymentMethods.attach(payment_method_id, { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    // Read masked PM details for vault record
    const pm = await stripe.paymentMethods.retrieve(payment_method_id) as Stripe.PaymentMethod;
    const card = pm.card || null;

    // Save in our vault (masked only)
    const { data: saved, error: vErr } = await supabase
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
      .select('id')
      .single();

    if (vErr) {
      try { await stripe.paymentMethods.detach(pm.id); } catch {}
      return res.status(500).json({ error: 'vault_db_failed' });
    }

    // Create a pending intent linked to vault
    const amount_cents = amountFor(plan, cycle);
    const { data: intentRow } = await supabase
      .from('payment_intents')
      .insert([{
        user_id: user.id,
        plan_id: plan,
        cycle,
        provider: 'stripe',
        amount_cents,
        currency: 'USD',
        status: 'pending',
        metadata: { vault_id: saved.id },
      }])
      .select('id')
      .single();

    return res.status(200).json({
      ok: true,
      vault_id: saved.id,
      intent_id: intentRow?.id ?? null,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'vault_failed', details: e?.message });
  }
}
