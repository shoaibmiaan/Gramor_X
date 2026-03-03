import type { SubscriptionPlan, SubscriptionPlanKey, SubscriptionStatus, PlanDisplay, SubscriptionSummary, StripeSubscriptionLike } from '@/types/subscription';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type { SubscriptionPlan, SubscriptionPlanKey, SubscriptionStatus, PlanDisplay, SubscriptionSummary };

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

export function getActiveSubscription<T extends { status?: string | null }>(subscriptions: T[]): T | null {
  if (!subscriptions.length) return null;
  return (
    subscriptions.find((sub) => {
      const status = normalizeStatus(sub.status);
      return status === 'active' || status === 'trialing' || status === 'past_due';
    }) ?? null
  );
}

export function summarizeStripeSubscription(
  subscription: StripeSubscriptionLike,
  fallbackPlan: SubscriptionPlan = 'free',
): Readonly<{
  plan: SubscriptionPlanKey;
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
}> {
  if (!subscription) {
    return {
      plan: normalizePlan(fallbackPlan),
      status: 'inactive',
    };
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const mappedPlan =
    typeof priceId === 'string' && priceId.includes('starter')
      ? 'starter'
      : typeof priceId === 'string' && priceId.includes('booster')
      ? 'booster'
      : typeof priceId === 'string' && priceId.includes('master')
      ? 'master'
      : normalizePlan(fallbackPlan);

  const status = normalizeStatus(subscription.status);
  const renewsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : undefined;
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : undefined;

  return {
    plan: mappedPlan,
    status,
    renewsAt,
    trialEndsAt,
  };
}

export type SubscriptionRow = Readonly<{
  id?: string;
  user_id: string;
  plan_id?: string | null;
  status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  renews_at?: string | null;
  trial_ends_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}>;

export type FeatureName = 'ai' | 'teacher' | string;

export async function getActiveSubscriptionRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) throw error;

  const rows = (data ?? []) as SubscriptionRow[];
  if (!rows.length) return null;

  return (
    rows.find((row) => {
      const status = normalizeStatus(row.status);
      return status === 'active' || status === 'trialing' || status === 'past_due';
    }) ?? rows[0] ?? null
  );
}

export async function isSubscriptionActive(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const subscription = await getActiveSubscriptionRecord(supabase, userId);
  if (!subscription) return false;

  const status = normalizeStatus(subscription.status);
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export async function requireActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SubscriptionRow> {
  const subscription = await getActiveSubscriptionRecord(supabase, userId);
  if (!subscription) throw new Error('subscription_required');

  const active = await isSubscriptionActive(supabase, userId);
  if (!active) throw new Error('subscription_inactive');

  return subscription;
}

export async function getUserPlan(supabase: SupabaseClient<Database>, userId: string): Promise<SubscriptionPlanKey> {
  const subscription = await getActiveSubscriptionRecord(supabase, userId);
  return normalizePlan(subscription?.plan_id);
}

export async function getFeatureAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: FeatureName,
): Promise<boolean> {
  const plan = await getUserPlan(supabase, userId);
  if (feature === 'ai') return plan !== 'free';
  if (feature === 'teacher') return plan === 'master';
  return plan !== 'free';
}
