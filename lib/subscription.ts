import { FEATURE_PLAN } from '@/lib/plan/featureMap';
import { PLAN_LABEL, USD_PLAN_PRICES, type Cycle, type PlanKey } from '@/lib/pricing';
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

type RawSubscriptionRow = {
  id?: string | null;
  user_id?: string | null;
  plan_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
};

type LegacyProfileSubscription = {
  plan_id?: string | null;
  membership?: string | null;
  subscription_status?: string | null;
  subscription_renews_at?: string | null;
  trial_ends_at?: string | null;
  premium_until?: string | null;
  stripe_customer_id?: string | null;
};

export type SubscriptionSnapshot = Readonly<{
  userId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  subscriptionId: string | null;
}>;

export type CanonicalSubscription = ActiveSubscription & {
  subscriptionId: string | null;
  customerId: string | null;
  source: 'subscriptions' | 'legacy_profile' | 'none';
};

type TransitionStatusInput = SubscriptionStatus | 'unpaid';

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing']);
const STATUS_VALUES = new Set<SubscriptionStatus>(['active', 'trialing', 'canceled', 'incomplete', 'past_due']);

export function normalizePlan(plan?: string | null): PlanId {
  return coercePlanId(plan ?? 'free');
}

export function normalizeSubscriptionStatus(status?: string | null): SubscriptionStatus {
  const value = (status ?? 'canceled').toLowerCase();
  return STATUS_VALUES.has(value as SubscriptionStatus) ? (value as SubscriptionStatus) : 'canceled';
}

function normalizeTransitionStatus(status: TransitionStatusInput): SubscriptionStatus {
  if (status === 'unpaid') return 'past_due';
  return normalizeSubscriptionStatus(status);
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
    return { planId: id, monthly: 0, annual: 0, monthlyDisplayFromAnnual: 0 };
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

function normalizeSubscriptionSnapshot(row: RawSubscriptionRow | null | undefined, userId: string): SubscriptionSnapshot {
  return {
    userId,
    plan: normalizePlan(row?.plan_id ?? 'free'),
    status: normalizeSubscriptionStatus(row?.status ?? 'canceled'),
    currentPeriodEnd: row?.current_period_end ?? null,
    subscriptionId: row?.id ?? null,
  };
}

function mapLegacyProfileToCanonical(userId: string, profile: LegacyProfileSubscription | null | undefined): CanonicalSubscription {
  const plan = normalizePlan(profile?.plan_id ?? profile?.membership ?? 'free');
  const normalizedStatus = normalizeSubscriptionStatus(profile?.subscription_status);
  const premiumUntil = toIso(profile?.premium_until);
  const status: SubscriptionStatus = premiumUntil && new Date(premiumUntil) > new Date() ? 'active' : normalizedStatus;

  return {
    userId,
    plan,
    status,
    renewsAt: toIso(profile?.subscription_renews_at) ?? premiumUntil,
    trialEndsAt: toIso(profile?.trial_ends_at),
    subscriptionId: null,
    customerId: profile?.stripe_customer_id ?? null,
    source: profile ? 'legacy_profile' : 'none',
  };
}

function mapSubscriptionRowToCanonical(
  userId: string,
  row: RawSubscriptionRow,
  customerId: string | null,
): CanonicalSubscription {
  return {
    userId,
    plan: normalizePlan(row.plan_id),
    status: normalizeSubscriptionStatus(row.status),
    renewsAt: toIso(row.current_period_end),
    trialEndsAt: toIso(row.trial_end),
    subscriptionId: row.id ?? null,
    customerId,
    source: 'subscriptions',
  };
}

async function wasTransitionApplied(provider: string, eventId: string, action: string): Promise<boolean> {
  const supabase = supabaseService();
  const { data } = await supabase
    .from('payment_events')
    .select('id')
    .eq('provider', provider)
    .eq('external_id', eventId)
    .eq('status', `subscription:${action}`)
    .maybeSingle();

  return !!data;
}

async function markTransitionApplied(provider: string, eventId: string, action: string, userId?: string | null, metadata: Record<string, unknown> = {}) {
  const supabase = supabaseService();
  await supabase.from('payment_events').insert([
    {
      provider,
      status: `subscription:${action}`,
      external_id: eventId,
      user_id: userId ?? null,
      metadata,
    },
  ]);
}

async function mirrorProfileSubscriptionState(input: {
  userId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  renewsAt?: string | null;
  trialEndsAt?: string | null;
  premiumUntil?: string | null;
  customerId?: string | null;
}) {
  const supabase = supabaseService();
  await supabase
    .from('profiles')
    .update({
      plan_id: input.plan,
      membership: input.plan,
      subscription_status: input.status,
      subscription_renews_at: input.renewsAt ?? null,
      trial_ends_at: input.trialEndsAt ?? null,
      premium_until: input.premiumUntil ?? null,
      stripe_customer_id: input.customerId ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.userId);
}

async function upsertCanonicalSubscriptionRow(input: {
  userId: string;
  subscriptionId?: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  renewsAt?: string | null;
  trialEndsAt?: string | null;
}) {
  const supabase = supabaseService();
  const row = {
    id: input.subscriptionId ?? undefined,
    user_id: input.userId,
    plan_id: input.plan,
    status: input.status,
    current_period_end: input.renewsAt ?? null,
    trial_end: input.trialEndsAt ?? null,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('subscriptions')
    .upsert(row, input.subscriptionId ? { onConflict: 'id' } : undefined);
}

export async function getLatestSubscriptionRow(userId: string): Promise<RawSubscriptionRow | null> {
  const supabase = supabaseService();
  const { data } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_id, status, current_period_end, trial_end')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as RawSubscriptionRow | null;
}

export async function getLatestSubscriptionSnapshotsForUsers(userIds: string[]): Promise<Record<string, SubscriptionSnapshot>> {
  if (userIds.length === 0) return {};

  const supabase = supabaseService();
  const { data } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_id, status, current_period_end')
    .in('user_id', userIds)
    .order('current_period_end', { ascending: false, nullsFirst: false });

  const rows = (data ?? []) as RawSubscriptionRow[];
  const latestByUser: Record<string, RawSubscriptionRow> = {};

  for (const row of rows) {
    const rowUserId = row.user_id;
    if (!rowUserId || latestByUser[rowUserId]) continue;
    latestByUser[rowUserId] = row;
  }

  const snapshots: Record<string, SubscriptionSnapshot> = {};
  for (const userId of userIds) {
    snapshots[userId] = normalizeSubscriptionSnapshot(latestByUser[userId], userId);
  }

  return snapshots;
}

export async function getCanonicalSubscription(userId: string): Promise<CanonicalSubscription> {
  const supabase = supabaseService();

  const [latestRow, profileRes] = await Promise.all([
    getLatestSubscriptionRow(userId),
    supabase
      .from('profiles')
      .select('stripe_customer_id, plan_id, membership, subscription_status, subscription_renews_at, trial_ends_at, premium_until')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const profile = (profileRes.data ?? null) as LegacyProfileSubscription | null;

  if (latestRow) {
    return mapSubscriptionRowToCanonical(userId, latestRow, profile?.stripe_customer_id ?? null);
  }

  return mapLegacyProfileToCanonical(userId, profile);
}

export async function getActiveSubscription(userId: string): Promise<ActiveSubscription> {
  const canonical = await getCanonicalSubscription(userId);
  return {
    userId,
    plan: canonical.plan,
    status: canonical.status,
    renewsAt: canonical.renewsAt,
    trialEndsAt: canonical.trialEndsAt,
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

export async function applySubscriptionActivation(input: {
  userId: string;
  plan: PlanId | PlanKey;
  provider: string;
  eventId: string;
  subscriptionId?: string | null;
  renewsAt?: string | null;
  trialEndsAt?: string | null;
  customerId?: string | null;
}) {
  if (await wasTransitionApplied(input.provider, input.eventId, 'activation')) return { duplicate: true as const };

  const plan = normalizePlan(input.plan);
  await upsertCanonicalSubscriptionRow({
    userId: input.userId,
    subscriptionId: input.subscriptionId,
    plan,
    status: 'active',
    renewsAt: input.renewsAt,
    trialEndsAt: input.trialEndsAt,
  });

  await mirrorProfileSubscriptionState({
    userId: input.userId,
    plan,
    status: 'active',
    renewsAt: input.renewsAt,
    trialEndsAt: input.trialEndsAt,
    premiumUntil: null,
    customerId: input.customerId,
  });

  await markTransitionApplied(input.provider, input.eventId, 'activation', input.userId, {
    subscriptionId: input.subscriptionId,
    plan,
  });

  return { duplicate: false as const };
}

export async function applySubscriptionRenewal(input: {
  userId: string;
  provider: string;
  eventId: string;
  subscriptionId?: string | null;
  renewsAt?: string | null;
}) {
  if (await wasTransitionApplied(input.provider, input.eventId, 'renewal')) return { duplicate: true as const };

  const current = await getCanonicalSubscription(input.userId);
  await upsertCanonicalSubscriptionRow({
    userId: input.userId,
    subscriptionId: input.subscriptionId ?? current.subscriptionId,
    plan: current.plan,
    status: 'active',
    renewsAt: input.renewsAt ?? current.renewsAt ?? null,
    trialEndsAt: current.trialEndsAt ?? null,
  });

  await mirrorProfileSubscriptionState({
    userId: input.userId,
    plan: current.plan,
    status: 'active',
    renewsAt: input.renewsAt ?? current.renewsAt ?? null,
    trialEndsAt: current.trialEndsAt ?? null,
    premiumUntil: null,
    customerId: current.customerId,
  });

  await markTransitionApplied(input.provider, input.eventId, 'renewal', input.userId, {
    subscriptionId: input.subscriptionId,
  });

  return { duplicate: false as const };
}

export async function applySubscriptionTransition(input: {
  userId: string;
  provider: string;
  eventId: string;
  status: TransitionStatusInput;
  subscriptionId?: string | null;
  renewsAt?: string | null;
  trialEndsAt?: string | null;
}) {
  if (await wasTransitionApplied(input.provider, input.eventId, 'transition')) return { duplicate: true as const };

  const current = await getCanonicalSubscription(input.userId);
  const status = normalizeTransitionStatus(input.status);
  const shouldDowngrade = status === 'canceled' || status === 'past_due';
  const nextPlan: PlanId = shouldDowngrade ? 'free' : current.plan;

  await upsertCanonicalSubscriptionRow({
    userId: input.userId,
    subscriptionId: input.subscriptionId ?? current.subscriptionId,
    plan: nextPlan,
    status,
    renewsAt: input.renewsAt ?? current.renewsAt ?? null,
    trialEndsAt: input.trialEndsAt ?? current.trialEndsAt ?? null,
  });

  await mirrorProfileSubscriptionState({
    userId: input.userId,
    plan: nextPlan,
    status,
    renewsAt: input.renewsAt ?? current.renewsAt ?? null,
    trialEndsAt: input.trialEndsAt ?? current.trialEndsAt ?? null,
    premiumUntil: shouldDowngrade ? null : current.renewsAt ?? null,
    customerId: current.customerId,
  });

  await markTransitionApplied(input.provider, input.eventId, 'transition', input.userId, {
    status,
    subscriptionId: input.subscriptionId,
  });

  return { duplicate: false as const };
}

export async function applyPinOrManualProvisioning(input: {
  userId: string;
  plan: PlanKey;
  provider: string;
  eventId: string;
  premiumUntil?: string | null;
  note?: string;
  amountCents?: number;
  cycle?: Cycle;
  email?: string | null;
}) {
  if (await wasTransitionApplied(input.provider, input.eventId, 'manual_provision')) return { duplicate: true as const };

  const premiumUntilIso = toIso(input.premiumUntil) ?? null;

  await upsertCanonicalSubscriptionRow({
    userId: input.userId,
    plan: input.plan,
    status: 'active',
    renewsAt: premiumUntilIso,
    trialEndsAt: null,
  });

  await mirrorProfileSubscriptionState({
    userId: input.userId,
    plan: input.plan,
    status: 'active',
    renewsAt: premiumUntilIso,
    trialEndsAt: null,
    premiumUntil: premiumUntilIso,
  });

  if (typeof input.amountCents === 'number' && input.cycle) {
    const supabase = supabaseService();
    await supabase.from('pending_payments').insert({
      user_id: input.userId,
      plan_key: input.plan,
      cycle: input.cycle,
      currency: 'USD',
      amount_cents: input.amountCents,
      status: 'due',
      note: input.note ?? null,
      email: input.email ?? null,
    });
  }

  await markTransitionApplied(input.provider, input.eventId, 'manual_provision', input.userId, {
    plan: input.plan,
    premiumUntil: premiumUntilIso,
  });

  return { duplicate: false as const };
}

export async function upsertSubscriptionStateFromWebhook(input: {
  userId: string;
  subscriptionId?: string | null;
  paymentId?: string | null;
  provider: string;
}) {
  const eventId = input.paymentId ?? input.subscriptionId ?? `${input.userId}:${input.provider}`;
  if (await wasTransitionApplied(input.provider, eventId, 'activation')) return;

  const current = await getCanonicalSubscription(input.userId);
  await applySubscriptionActivation({
    userId: input.userId,
    plan: current.plan === 'free' ? 'booster' : current.plan,
    provider: input.provider,
    eventId,
    subscriptionId: input.subscriptionId,
    renewsAt: current.renewsAt ?? null,
    trialEndsAt: current.trialEndsAt ?? null,
    customerId: current.customerId,
  });

  if (input.paymentId) {
    const supabase = supabaseService();
    await supabase
      .from('payments')
      .update({ status: 'paid', provider: input.provider, provider_payment_id: input.paymentId, updated_at: new Date().toISOString() })
      .eq('id', input.paymentId);
  }
}

export function getCyclePricing(planId: string, cycle: Cycle) {
  const pricing = getPlanPricing(planId);
  return cycle === 'monthly' ? pricing.monthly : pricing.annual;
}
