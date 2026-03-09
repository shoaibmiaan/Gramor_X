// pages/api/subscriptions/portal.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { env } from '@/lib/env';
import { getCanonicalSubscription } from '@/lib/subscription';

type Invoice = Readonly<{
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
}>;

type SubscriptionSummary = Readonly<{
  plan: 'starter' | 'booster' | 'master' | 'free';
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due';
  renewsAt?: string;
  trialEndsAt?: string;
}>;

type SummaryResponse = Readonly<{
  subscription: SubscriptionSummary;
  invoices: Invoice[];
}>;

type ResBody = SummaryResponse | Readonly<{ ok: false; error: string }>;

const getOrigin = (req: NextApiRequest) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
};

const handler: NextApiHandler<ResBody> = async (req, res) => {
  const supabase = createSupabaseServerClient({ req });
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const canonical = await getCanonicalSubscription(userId);
  const customerId = canonical.customerId ?? undefined;

  const openPortal =
    req.headers['x-open-portal'] === '1' ||
    (req.headers['content-type']?.includes('application/x-www-form-urlencoded') ?? false);

  // @ts-expect-error TODO: add `stripe` dependency for full types
  const Stripe = (await import('stripe')).default ?? (await import('stripe'));
  const secret = env.STRIPE_SECRET_KEY;
  const stripe = secret ? new Stripe(secret, { apiVersion: '2024-06-20' }) : null;

  if (openPortal) {
    if (!stripe || !customerId)
      return res
        .status(400)
        .json({ ok: false, error: 'Customer portal unavailable (missing Stripe or customer id)' });

    const origin = getOrigin(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account/billing`,
    });

    res.setHeader('Location', session.url);
    return res.status(303).end();
  }

  if (!stripe || !customerId) {
    const fallback: SummaryResponse = {
      subscription: {
        plan: canonical.plan,
        status: canonical.status,
        renewsAt: canonical.renewsAt,
        trialEndsAt: canonical.trialEndsAt,
      },
      invoices: [],
    };
    return res.status(200).json(fallback);
  }

  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
  const sub = subs.data[0];

  const summary: SubscriptionSummary = {
    plan: canonical.plan,
    status: canonical.status,
    renewsAt: canonical.renewsAt,
    trialEndsAt: canonical.trialEndsAt,
  };

  if (sub) {
    summary.status = canonical.status;
    summary.renewsAt = canonical.renewsAt ?? (sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined);
    summary.trialEndsAt = canonical.trialEndsAt ?? (sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined);
  }

  const invs = await stripe.invoices.list({ customer: customerId, limit: 12 });
  const invoices: Invoice[] = invs.data.map((i) => ({
    id: i.id,
    amount: i.amount_paid ?? i.amount_due ?? 0,
    currency: i.currency?.toUpperCase() || 'USD',
    createdAt: new Date((i.status_transitions?.finalized_at || i.created) * 1000).toISOString(),
    hostedInvoiceUrl: i.hosted_invoice_url || undefined,
    status: ((i.status as Invoice['status']) || 'open'),
  }));

  return res.status(200).json({ subscription: summary, invoices });
};

export default handler;
