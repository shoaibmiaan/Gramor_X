import type Stripe from 'stripe';

export const SUBSCRIPTION_ACTIVE_STATUSES = ['active', 'trialing'] as const;

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'inactive';

export type SubscriptionPlan = 'starter' | 'booster' | 'master' | 'free';

export type SubscriptionSummary = Readonly<{
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
}>;

export function normalizeSubscriptionStatus(status: unknown): SubscriptionStatus {
  const value = typeof status === 'string' ? status.toLowerCase() : '';
  switch (value) {
    case 'active':
    case 'trialing':
    case 'canceled':
    case 'incomplete':
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return value;
    default:
      return 'inactive';
  }
}

export function isSubscriptionActive(subscriptionOrStatus: { status?: unknown } | unknown): boolean {
  const status =
    typeof subscriptionOrStatus === 'object' && subscriptionOrStatus !== null && 'status' in subscriptionOrStatus
      ? normalizeSubscriptionStatus(subscriptionOrStatus.status)
      : normalizeSubscriptionStatus(subscriptionOrStatus);

  return SUBSCRIPTION_ACTIVE_STATUSES.includes(status as (typeof SUBSCRIPTION_ACTIVE_STATUSES)[number]);
}

export function getActiveSubscription<T extends { status?: unknown }>(subscriptions: readonly T[] | null | undefined): T | null {
  if (!subscriptions?.length) return null;

  const prioritized = subscriptions.find((subscription) => normalizeSubscriptionStatus(subscription.status) === 'active');
  if (prioritized) return prioritized;

  const trialing = subscriptions.find((subscription) => normalizeSubscriptionStatus(subscription.status) === 'trialing');
  return trialing ?? null;
}

export class SubscriptionRequiredError extends Error {
  readonly code = 'SUBSCRIPTION_INACTIVE';
  readonly statusCode = 402;

  constructor(message = 'Active subscription required') {
    super(message);
    this.name = 'SubscriptionRequiredError';
  }
}

export function requireActiveSubscription<T extends { status?: unknown }>(
  subscription: T | null | undefined,
  message?: string,
): T {
  if (!subscription || !isSubscriptionActive(subscription)) {
    throw new SubscriptionRequiredError(message);
  }

  return subscription;
}

export function summarizeStripeSubscription(
  sub: Stripe.Subscription | null | undefined,
  fallbackPlan: SubscriptionPlan = 'free',
): SubscriptionSummary {
  const nickname = (sub?.items?.data?.[0]?.price?.nickname ?? '').toString().toLowerCase();
  const plan: SubscriptionPlan =
    nickname === 'starter' || nickname === 'booster' || nickname === 'master' ? (nickname as SubscriptionPlan) : fallbackPlan;

  return {
    plan,
    status: normalizeSubscriptionStatus(sub?.status),
    renewsAt: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
    trialEndsAt: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined,
  };
}

export function mapSubscriptionStatusToVariant(status: SubscriptionStatus):
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'secondary'
  | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
    case 'incomplete':
      return 'warning';
    case 'unpaid':
      return 'danger';
    case 'paused':
      return 'secondary';
    case 'canceled':
    case 'inactive':
    default:
      return 'neutral';
  }
}

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
