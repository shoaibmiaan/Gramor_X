// pages/api/billing/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { summarizeFromStripe, mapStripeInvoice, type SubscriptionSummary } from '@/lib/subscriptions';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

type DueRow = Readonly<{
  id: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  status: 'due' | 'collected' | 'canceled';
  plan_key: 'starter' | 'booster' | 'master';
  cycle: 'monthly' | 'annual';
}>;

type BillingSummaryResponse =
  | {
      ok: true;
      summary: SubscriptionSummary;
      invoices: ReturnType<typeof mapStripeInvoice>[];
      dues: DueRow[];
      customerId?: string;
      needsStripeSetup?: boolean;
    }
  | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<BillingSummaryResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');

  let supabase;
  try {
    supabase = createSupabaseServerClient({ req, res });
  } catch (error) {
    console.error('Billing API - Supabase client creation failed:', error);
    return res.status(503).json({ ok: false, error: 'service_unavailable' });
  }

  let auth;
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    auth = authData;
    console.log('Billing API - getUser result:', { user: auth?.user ? 'exists' : 'null', authError });  // Debug log
  } catch (error) {
    console.error('Billing API - Auth fetch failed:', error);
    return res.status(503).json({ ok: false, error: 'auth_unavailable' });
  }

  const user = auth?.user;
  if (!user) {
    console.error('Billing API - No user');  // Debug log
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  let profile;
  try {
    const { data: profileData, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, stripe_customer_id, plan_id, premium_until')
      .eq('id', user.id)
      .single();
    profile = profileData;
    if (pErr) throw pErr;
  } catch (error) {
    console.error('Billing API - Profile fetch failed:', error);
    return res.status(500).json({ ok: false, error: 'profile_load_failed' });
  }

  // Dues
  let dues: DueRow[] = [];
  try {
    const { data: rows } = await supabase
      .from('pending_payments')
      .select('id, amount_cents, currency, created_at, status, plan_key, cycle')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    dues = (rows ?? []).filter(d => d.status === 'due') as DueRow[];
  } catch (error) {
    console.error('Billing API - Dues fetch failed:', error);
    // ignore and proceed with empty dues
  }

  // Return mock response if Stripe is not configured
  if (!stripe) {
    return res.status(200).json({
      ok: true,
      summary: {
        plan: (profile?.plan_id as SubscriptionSummary['plan']) ?? 'free',
        status: 'canceled',
      },
      invoices: [],
      dues,
      needsStripeSetup: true,
    });
  }

  let customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    try {
      const cust = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = cust.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    } catch (error) {
      console.error('Billing API - Stripe customer creation failed:', error);
      return res.status(500).json({ ok: false, error: 'stripe_setup_failed' });
    }
  }

  let subs;
  try {
    subs = await stripe.subscriptions.list({
      customer: customerId, status: 'all', limit: 3, expand: ['data.items.data.price'],
    });
  } catch (error) {
    console.error('Billing API - Stripe subscriptions fetch failed:', error);
    return res.status(500).json({ ok: false, error: 'stripe_fetch_failed' });
  }

  const sub =
    subs.data.find(s => s.status === 'active' || s.status === 'trialing') ??
    subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  const summary = summarizeFromStripe(sub, (profile?.plan_id as SubscriptionSummary['plan']) ?? 'free');

  let invs;
  try {
    invs = await stripe.invoices.list({
      customer: customerId, limit: 12, status: 'open,paid,void,uncollectible,draft',
    });
  } catch (error) {
    console.error('Billing API - Stripe invoices fetch failed:', error);
    return res.status(500).json({ ok: false, error: 'stripe_invoices_failed' });
  }

  const invoices = invs.data.map(mapStripeInvoice);

  return res.status(200).json({ ok: true, summary, invoices, customerId, dues });
}