// pages/api/billing/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { summarizeFromStripe, mapStripeInvoice, type SubscriptionSummary } from '@/lib/subscriptions';
import { createServerClient } from '@supabase/ssr';
import { serialize } from 'cookie';

// Strict response shape
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

  // ✅ Proper cookie adapter (get/set/remove) so Supabase can refresh/write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies[name],
        set: (name: string, value: string, options: any) => {
          res.setHeader('Set-Cookie', serialize(name, value, options));
        },
        remove: (name: string, options: any) => {
          res.setHeader('Set-Cookie', serialize(name, '', { ...options, maxAge: 0 }));
        },
      },
    }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  // Profile
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, stripe_customer_id, plan_id, premium_until')
    .eq('id', user.id)
    .single();

  if (pErr) return res.status(500).json({ ok: false, error: 'profile_load_failed' });

  // Dues (safe even if table missing)
  let dues: DueRow[] = [];
  try {
    const { data: rows } = await supabase
      .from('pending_payments')
      .select('id, amount_cents, currency, created_at, status, plan_key, cycle')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    dues = (rows ?? []).filter(d => d.status === 'due') as DueRow[];
  } catch {
    dues = [];
  }

  // If Stripe isn’t configured, return a safe summary
  if (!stripe) {
    return res.status(200).json({
      ok: true,
      summary: {
        plan: ((profile?.plan_id as SubscriptionSummary['plan']) ?? 'free'),
        status: 'canceled',
      },
      invoices: [],
      needsStripeSetup: true,
      dues,
    });
  }

  let customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const cust = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = cust.id;
    // best effort persist
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 3,
    expand: ['data.items.data.price'],
  });

  const sub =
    subs.data.find(s => s.status === 'active' || s.status === 'trialing') ??
    subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  const summary = summarizeFromStripe(sub, ((profile?.plan_id as SubscriptionSummary['plan']) ?? 'free'));

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
    dues,
  });
}
