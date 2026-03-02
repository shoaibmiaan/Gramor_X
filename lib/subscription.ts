import type { PlanId } from '@/types/pricing';

export type SubscriptionPlan = PlanId;

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'inactive'
  | 'expired'
  | 'none';

export type SubscriptionPlanKey = 'free' | 'starter' | 'booster' | 'master';

export type PlanDisplay = {
  name: string;
  features: string[];
  price?: string;
};

export const PLAN_DISPLAY: Record<SubscriptionPlanKey, PlanDisplay> = {
  free: {
    name: 'Free',
    features: ['Basic access', 'Limited mocks', 'Community support'],
    price: '$0',
  },
  starter: {
    name: 'Starter',
    features: ['More mocks', 'Basic analytics', 'Email reminders'],
    price: '$5.99/month',
  },
  booster: {
    name: 'Booster',
    features: ['Full mocks', 'Band analytics', 'AI feedback'],
    price: '$9.99/month',
  },
  master: {
    name: 'Master',
    features: ['Everything in Booster', 'Teacher tools', 'Priority support'],
    price: '$14.99/month',
  },
};

export function normalizePlan(plan?: string | null): SubscriptionPlanKey {
  if (plan === 'starter' || plan === 'booster' || plan === 'master') return plan;
  return 'free';
}

export function normalizeStatus(status?: string | null): SubscriptionStatus {
  if (!status) return 'inactive';
  if (
    status === 'active' ||
    status === 'trialing' ||
    status === 'canceled' ||
    status === 'incomplete' ||
    status === 'past_due' ||
    status === 'unpaid' ||
    status === 'paused' ||
    status === 'inactive' ||
    status === 'expired' ||
    status === 'none'
  ) {
    return status;
  }
  return 'inactive';
}

export function hasActiveSubscription(plan: SubscriptionPlanKey, status: SubscriptionStatus): boolean {
  return plan !== 'free' && (status === 'active' || status === 'trialing');
}

export function isTrialActive(trialEndsAt?: string | null): boolean {
  if (!trialEndsAt) return false;
  const date = new Date(trialEndsAt);
  return !Number.isNaN(date.getTime()) && date > new Date();
}

export function formatSubscriptionLabel(value?: string | null): string {
  if (!value) return 'None';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSubscriptionStatusVariant(status: SubscriptionStatus) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'trialing':
      return 'info' as const;
    case 'past_due':
    case 'incomplete':
      return 'warning' as const;
    case 'unpaid':
      return 'danger' as const;
    case 'paused':
      return 'secondary' as const;
    case 'canceled':
    case 'expired':
    case 'none':
    case 'inactive':
    default:
      return 'neutral' as const;
  }
}

export function formatDateLabel(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}
