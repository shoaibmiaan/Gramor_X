import { FEATURE_PLAN } from '@/lib/plan/featureMap';
import { PLAN_LABEL, USD_PLAN_PRICES, type Cycle } from '@/lib/pricing';
import { supabaseService } from '@/lib/supabaseServer';
import { coercePlanId, PLAN_RANK, type PlanId } from '@/types/pricing';

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due';

export type ActiveSubscription = Readonly<{
  userId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
}>;

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing']);
const STATUS_VALUES = new Set<SubscriptionStatus>(['active', 'trialing', 'canceled', 'incomplete', 'past_due']);

export function normalizePlan(plan?: string | null): PlanId {
  return coercePlanId(plan ?? 'free');
}

export function normalizeSubscriptionStatus(status?: string | null): SubscriptionStatus {
  const value = (status ?? 'canceled').toLowerCase();
  return STATUS_VALUES.has(value as SubscriptionStatus) ? (value as SubscriptionStatus) : 'canceled';
}

export function getStandardPlanName(planId: string): PlanId {
  return normalizePlan(planId);
}

export function getPlanTiers(): Array<{ id: PlanId; rank: number; label: string }> {
  return (['free', 'starter', 'booster', 'master'] as PlanId[]).map((id) => ({
    id,
    rank: PLAN_RANK[id],
    label: id === 'free' ? 'Free' : PLAN_LABEL[id],
  }));
}

export function getPlanPricing(planId: string) {
  const id = normalizePlan(planId);
  if (id === 'free') {
    return {
      planId: id,
      monthly: 0,
      annual: 0,
      monthlyDisplayFromAnnual: 0,
    };
  }

  const row = USD_PLAN_PRICES[id];
  return {
    planId: id,
    monthly: row.monthly,
    annual: row.annual,
    monthlyDisplayFromAnnual: row.annual / 12,
  };
}

function toIso(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function getActiveSubscription(userId: string): Promise<ActiveSubscription> {
  const supabase = supabaseService();
  const { data } = await supabase
    .from('profiles')
    .select('plan_id, membership, subscription_status, subscription_renews_at, trial_ends_at, premium_until')
    .eq('id', userId)
    .maybeSingle();

  const row = (data ?? null) as {
    plan_id?: string | null;
    membership?: string | null;
    subscription_status?: string | null;
    subscription_renews_at?: string | null;
    trial_ends_at?: string | null;
    premium_until?: string | null;
  } | null;

  const plan = normalizePlan(row?.plan_id ?? row?.membership ?? 'free');
  const normalizedStatus = normalizeSubscriptionStatus(row?.subscription_status);
  const premiumUntil = toIso(row?.premium_until);
  const fallbackStatus: SubscriptionStatus = premiumUntil && new Date(premiumUntil) > new Date() ? 'active' : normalizedStatus;

  return {
    userId,
    plan,
    status: fallbackStatus,
    renewsAt: toIso(row?.subscription_renews_at) ?? premiumUntil,
    trialEndsAt: toIso(row?.trial_ends_at),
  };
}

export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  return ACTIVE_STATUSES.has(sub.status) && sub.plan !== 'free';
}

export async function requireActiveSubscription(userId: string): Promise<ActiveSubscription> {
  const sub = await getActiveSubscription(userId);
  if (!ACTIVE_STATUSES.has(sub.status) || sub.plan === 'free') {
    throw new Error('Active subscription required');
  }
  return sub;
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  const sub = await getActiveSubscription(userId);
  return sub.plan;
}

export async function getFeatureAccess(userId: string, feature: string): Promise<boolean> {
  const requiredPlan = FEATURE_PLAN[feature] ?? 'free';
  const userPlan = await getUserPlan(userId);
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export function getCyclePricing(planId: string, cycle: Cycle) {
  const pricing = getPlanPricing(planId);
  return cycle === 'monthly' ? pricing.monthly : pricing.annual;
}
