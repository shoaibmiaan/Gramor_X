// pages/api/billing/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { summarizeFromStripe, mapStripeInvoice, type SubscriptionSummary } from '@/lib/subscriptions';
import { planFromPriceId } from '@/lib/pricing';
import { createServerClient } from '@supabase/ssr';

// Strict response shape
type BillingSummaryResponse = {
  ok: true;
  summary: SubscriptionSummary;
  invoices: ReturnType<typeof mapStripeInvoice>[];
  customerId?: string;
  needsStripeSetup?: boolean;
} | {
  ok: false;
  error: string;
};

function getOrigin(req: NextApiRequest) {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BillingSummaryResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  // Supabase (server) – RLS-safe
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => req.cookies[name] } }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  // Fetch profile (RLS must allow the owner to select their row)
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, stripe_customer_id, plan_id, premium_until')
    .eq('id', user.id)
    .single();

  if (pErr) return res.status(500).json({ ok: false, error: 'profile_load_failed' });

  // If Stripe isn’t configured, return a safe "free" summary instead of throwing
  if (!stripe) {
    return res.status(200).json({
      ok: true,
      summary: {
        plan: 'free',
        status: 'canceled',
      },
      invoices: [],
      needsStripeSetup: true,
    });
  }

  let customerId = profile?.stripe_customer_id as string | null | undefined;

  // Create a customer if missing (allow update if policies permit)
  if (!customerId) {
    const cust = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = cust.id;
    // Try to persist (ignore failure if RLS disallows; it won’t break the response)
    // If you require admin privileges, switch to a service role client here.
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  // Get the most relevant subscription (active/trialing, else latest)
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 3,
    expand: ['data.items.data.price'],
  });

  // prefer active/trialing
  const sub =
    subs.data.find(s => s.status === 'active' || s.status === 'trialing') ??
    subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  const summary = summarizeFromStripe(sub, 'free');

  // Also map invoices (latest first)
  const invs = await stripe.invoices.list({
    customer: customerId,
    limit: 12,
    status: 'open,paid,void,uncollectible,draft',
  });

  const invoices = invs.data.map(mapStripeInvoice);

  return res.status(200).json({
    ok: true,
    summary,
    invoices,
    customerId,
  });
}
