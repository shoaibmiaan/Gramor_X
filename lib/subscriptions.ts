import type Stripe from 'stripe';

import {
  normalizePlan,
  normalizeSubscriptionStatus,
  type SubscriptionStatus,
} from '@/lib/subscription';
import type { PlanId } from '@/types/pricing';

export type SubscriptionPlan = PlanId;

export type Invoice = Readonly<{
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
}>;

export type SubscriptionSummary = Readonly<{
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
}>;

export function summarizeFromStripe(
  sub: Stripe.Subscription | null | undefined,
  fallbackPlan: SubscriptionPlan = 'free'
): SubscriptionSummary {
  const nickname = (sub?.items?.data?.[0]?.price?.nickname ?? '').toString().toLowerCase();

  return {
    plan: normalizePlan(nickname || fallbackPlan),
    status: normalizeSubscriptionStatus(sub?.status),
    renewsAt: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
    trialEndsAt: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined,
  };
}

export function mapStripeInvoice(i: Stripe.Invoice): Invoice {
  const createdAtSec = (i.status_transitions?.finalized_at ?? i.created) || i.created;
  return {
    id: i.id,
    amount: i.amount_paid ?? i.amount_due ?? 0,
    currency: (i.currency ?? 'usd').toUpperCase(),
    createdAt: new Date(createdAtSec * 1000).toISOString(),
    hostedInvoiceUrl: i.hosted_invoice_url ?? undefined,
    status: (i.status as Invoice['status']) ?? 'open',
  };
}

export { normalizePlan, normalizeSubscriptionStatus } from '@/lib/subscription';
