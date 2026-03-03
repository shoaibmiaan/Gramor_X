// pages/api/subscriptions/portal.ts
import type { NextApiHandler, NextApiRequest } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { env } from '@/lib/env';
import { getSubscriptionSummary } from '@/lib/repositories/subscriptionRepository';
import { getActiveSubscription, summarizeStripeSubscription } from '@/lib/subscription';
import { mapStripeInvoice } from '@/lib/subscriptions';
import type {
  BillingInvoice as Invoice,
  SubscriptionApiResponse,
  PortalSummaryResponse,
  SubscriptionSummary,
} from '@/types/subscription';
import { isRecentAuthentication } from '@/lib/auth/recentAuth';
import { requireAuth, writeAuthError, AuthError } from '@/lib/auth';

const getOrigin = (req: NextApiRequest) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
};

const handler: NextApiHandler<SubscriptionApiResponse> = async (req, res) => {
  const supabase = createSupabaseServerClient({ req, res });
  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }
  const userId = user.id;

  const dbSummary = await getSubscriptionSummary(supabase, userId);
  const customerId = dbSummary.customerId;

  // If the request is a form POST (no JSON) we assume "Open customer portal" and redirect.
  // You can also set a header `x-open-portal: 1` to force redirect mode.
  const openPortal =
    req.headers['x-open-portal'] === '1' ||
    (req.headers['content-type']?.includes('application/x-www-form-urlencoded') ?? false);

  if (openPortal && !isRecentAuthentication(req, 15 * 60)) {
    return res.status(403).json({ ok: false, error: 'Re-authentication required' });
  }

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

  // JSON summary mode (used by pages/account/billing.tsx)
  if (!stripe || !customerId) {
    const fallback: PortalSummaryResponse = {
      subscription: {
        plan: dbSummary.plan,
        status: dbSummary.status,
        renewsAt: dbSummary.renewsAt,
        trialEndsAt: dbSummary.trialEndsAt,
      },
      invoices: [],
    };
    return res.status(200).json(fallback);
  }

  // Pull latest subscription + last few invoices
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 3 });
  const sub = getActiveSubscription(subs.data) ?? subs.data[0];

  const nextSummary = summarizeStripeSubscription(sub, dbSummary.plan);
  const summary: SubscriptionSummary = {
    ...nextSummary,
    status: nextSummary.status === 'inactive' ? 'canceled' : nextSummary.status,
  };

  const invs = await stripe.invoices.list({ customer: customerId, limit: 12 });
  const invoices: Invoice[] = invs.data.map(mapStripeInvoice);

  return res.status(200).json({ subscription: summary, invoices });
};

export default handler;
