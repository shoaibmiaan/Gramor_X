import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionTier } from '@/lib/navigation/types';

export type RepoClient = SupabaseClient<any, 'public', any>;
export type PlanId = 'free' | 'starter' | 'booster' | 'master';

type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | null;

const PLAN_TO_TIER: Record<PlanId, SubscriptionTier> = {
  free: 'free',
  starter: 'seedling',
  booster: 'rocket',
  master: 'owl',
};

const TIER_TO_PLAN: Record<SubscriptionTier, PlanId> = {
  free: 'free',
  seedling: 'starter',
  rocket: 'booster',
  owl: 'master',
};

export function normalizePlan(plan: string | null | undefined): PlanId {
  const p = String(plan ?? 'free').toLowerCase();
  return p === 'starter' || p === 'booster' || p === 'master' ? p : 'free';
}

export function planToTier(plan: string | null | undefined): SubscriptionTier {
  return PLAN_TO_TIER[normalizePlan(plan)];
}

export function tierToPlan(tier: SubscriptionTier): PlanId {
  return TIER_TO_PLAN[tier];
}

export async function getLatestSubscription(client: RepoClient, userId: string) {
  return client
    .from('subscriptions')
    .select('user_id, plan_id, status, renews_at, created_at, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      user_id?: string;
      plan_id?: string | null;
      status?: SubscriptionStatus;
      renews_at?: string | null;
      metadata?: Record<string, unknown> | null;
    }>();
}

export async function getUserTier(client: RepoClient, userId: string) {
  const { data, error } = await getLatestSubscription(client, userId);
  if (error) return { tier: 'free' as SubscriptionTier, role: null as string | null, status: null as SubscriptionStatus };

  return {
    tier: planToTier(data?.plan_id),
    role: null as string | null,
    status: data?.status ?? null,
  };
}

export async function getSubscriptionSummary(client: RepoClient, userId: string) {
  const { data, error } = await getLatestSubscription(client, userId);
  if (error || !data) {
    return {
      plan: 'free' as PlanId,
      status: 'canceled' as const,
      renewsAt: undefined,
      trialEndsAt: undefined,
      customerId: undefined as string | undefined,
    };
  }

  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  return {
    plan: normalizePlan(data.plan_id),
    status: ((data.status ?? 'canceled') as Exclude<SubscriptionStatus, null>),
    renewsAt: data.renews_at ?? undefined,
    trialEndsAt: typeof metadata.trial_ends_at === 'string' ? metadata.trial_ends_at : undefined,
    customerId: typeof metadata.stripe_customer_id === 'string' ? metadata.stripe_customer_id : undefined,
  };
}


export async function getPlanFeatureFlags(client: RepoClient, planId: PlanId) {
  return client
    .from('plans')
    .select('id, feature_flags')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle<{ id: string; feature_flags: Record<string, boolean> | null }>();
}

export async function getEntitlementSnapshot(client: RepoClient, userId: string) {
  const summary = await getSubscriptionSummary(client, userId);
  const tier = planToTier(summary.plan);
  const { data: planData, error } = await getPlanFeatureFlags(client, summary.plan);

  return {
    plan: summary.plan,
    tier,
    status: summary.status,
    featureFlags: (planData?.feature_flags ?? {}) as Record<string, boolean>,
    error,
  };
}
