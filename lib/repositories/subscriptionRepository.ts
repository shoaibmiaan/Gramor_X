import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfilePlanAndRole, type RepoClient } from '@/lib/repositories/profileRepository';

export type PlanId = 'free' | 'starter' | 'booster' | 'master';

export function normalizePlan(plan: string | null | undefined): PlanId {
  const p = String(plan ?? 'free').toLowerCase();
  return p === 'starter' || p === 'booster' || p === 'master' ? p : 'free';
}

export async function getLatestSubscriptionPlan(client: SupabaseClient<any, 'public', any>, userId: string) {
  const { data, error } = await client
    .from('subscriptions')
    .select('plan_id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ plan_id?: string | null; status?: string | null }>();

  if (error) return { plan: 'free' as PlanId, status: null as string | null, source: 'fallback' as const };
  return {
    plan: normalizePlan(data?.plan_id),
    status: data?.status ?? null,
    source: 'subscriptions' as const,
  };
}

export async function getUserEffectivePlan(client: RepoClient, userId: string) {
  const latest = await getLatestSubscriptionPlan(client, userId);
  if (latest.plan !== 'free') return latest;

  const { data } = await getProfilePlanAndRole(client, userId);
  return {
    plan: normalizePlan(data?.plan),
    status: latest.status,
    source: data?.plan ? ('profiles' as const) : ('fallback' as const),
  };
}
