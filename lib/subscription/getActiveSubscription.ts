import type { SupabaseClient } from '@supabase/supabase-js';

import { getAdminClient } from '@/lib/supabaseAdmin';
import type { Database } from '@/types/supabase';

export type EnterprisePlan = 'free' | 'premium' | 'pro';
export type EnterpriseSubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'inactive';

export type ActiveSubscription = Readonly<{
  plan: EnterprisePlan;
  status: EnterpriseSubscriptionStatus;
  currentPeriodEnd: Date | null;
  isActive: boolean;
}>;

type SubscriptionRow = {
  plan_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  renews_at?: string | null;
};

function normalizePlan(plan?: string | null): EnterprisePlan {
  const value = String(plan ?? '').toLowerCase();
  if (value === 'pro' || value === 'master') return 'pro';
  if (value === 'premium' || value === 'starter' || value === 'booster') return 'premium';
  return 'free';
}

function normalizeStatus(status?: string | null): EnterpriseSubscriptionStatus {
  if (status === 'active' || status === 'trialing' || status === 'canceled' || status === 'past_due') return status;
  return 'inactive';
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function selectBest(rows: SubscriptionRow[]): SubscriptionRow | null {
  if (!rows.length) return null;
  return rows.find((row) => {
    const status = normalizeStatus(row.status);
    return status === 'active' || status === 'trialing' || status === 'past_due';
  }) ?? rows[0] ?? null;
}

export async function getActiveSubscription(
  userId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<ActiveSubscription> {
  const supabase = supabaseClient ?? getAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end, renews_at, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) throw error;

  const row = selectBest((data ?? []) as SubscriptionRow[]);
  if (!row) {
    return {
      plan: 'free',
      status: 'inactive',
      currentPeriodEnd: null,
      isActive: false,
    };
  }

  const plan = normalizePlan(row.plan_id);
  const status = normalizeStatus(row.status);

  return {
    plan,
    status,
    currentPeriodEnd: toDate(row.current_period_end ?? row.renews_at),
    isActive: plan !== 'free' && (status === 'active' || status === 'trialing' || status === 'past_due'),
  };
}

export async function requireActiveSubscription(
  userId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<ActiveSubscription> {
  const subscription = await getActiveSubscription(userId, supabaseClient);
  if (!subscription.isActive) throw new Error('subscription_inactive');
  return subscription;
}
