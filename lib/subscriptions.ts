// lib/subscriptions.ts
import type Stripe from 'stripe';
import { summarizeStripeSubscription } from '@/lib/subscription';

export type SubscriptionPlan = 'starter' | 'booster' | 'master' | 'free';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due';

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
  const summary = summarizeStripeSubscription(sub, fallbackPlan);
  return {
    plan: summary.plan,
    status: summary.status === 'inactive' ? 'canceled' : summary.status,
    renewsAt: summary.renewsAt,
    trialEndsAt: summary.trialEndsAt,
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
