// lib/usage.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { getActiveSubscriptionRecord, normalizePlan } from '@/lib/subscription';
import type { Database } from '@/types/supabase';
import type {
  Feature,
  IncrementReq,
  IncrementRes,
  LimitExceededPayload,
  UsageDecision,
  UsageGuardResult,
  UsageKey,
  UsageRecord,
} from '@/types/usage';

export type { IncrementReq, IncrementRes, LimitExceededPayload, UsageDecision, UsageKey, Feature };

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  starter: 100,
  booster: 300,
  master: 1000,
};

const FEATURE_LIMITS: Record<string, Partial<Record<Feature, number>>> = {
  free: {
    'ai.explain': 5,
    'ai.summary': 3,
    'ai.recommend': 3,
    'ai.profile_suggest': 2,
    'ai.next_item': 10,
    'ai.writing.score': 5,
    'ai.speaking.evaluate': 5,
    'ai.chat': 15,
  },
  starter: {
    'ai.explain': 40,
    'ai.summary': 40,
    'ai.recommend': 30,
    'ai.profile_suggest': 20,
    'ai.next_item': 60,
    'ai.writing.score': 50,
    'ai.speaking.evaluate': 50,
    'ai.chat': 120,
  },
  booster: {
    'ai.explain': 120,
    'ai.summary': 120,
    'ai.recommend': 100,
    'ai.profile_suggest': 80,
    'ai.next_item': 200,
    'ai.writing.score': 150,
    'ai.speaking.evaluate': 150,
    'ai.chat': 300,
  },
  master: {
    'ai.explain': 400,
    'ai.summary': 400,
    'ai.recommend': 300,
    'ai.profile_suggest': 200,
    'ai.next_item': 500,
    'ai.writing.score': 500,
    'ai.speaking.evaluate': 500,
    'ai.chat': 1200,
  },
};

export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function toPercentage(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export async function getUserPlanForUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<'free' | 'starter' | 'booster' | 'master'> {
  const sub = await getActiveSubscriptionRecord(supabase, userId);
  return normalizePlan(sub?.plan_id);
}

export function getLimitForPlanAndFeature(plan: string, feature: Feature) {
  return FEATURE_LIMITS[plan]?.[feature] ?? PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export async function getTodayUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: Feature,
): Promise<UsageRecord | null> {
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('id, user_id, feature, requests, tokens, date, created_at, updated_at')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('date', todayISO())
    .maybeSingle();

  if (error) throw error;
  return (data as UsageRecord | null) ?? null;
}

export async function getUsageForDateRange(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: Feature,
  startDate: string,
  endDate: string,
): Promise<UsageRecord[]> {
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('id, user_id, feature, requests, tokens, date, created_at, updated_at')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as UsageRecord[];
}




// Backward-compatible quota helpers used across non-Phase3 routes.
export async function checkLimit(
  arg1: SupabaseClient<Database> | { userId: string; key: string; limit: number; increment?: boolean },
  userId?: string,
  feature?: Feature,
): Promise<{ allowed: boolean; used: number; limit: number; count: number; remaining: number }> {
  if (typeof (arg1 as { userId?: string }).userId === 'string') {
    const payload = arg1 as { userId: string; key: string; limit: number; increment?: boolean };
    const today = todayISO();
    const { userId: legacyUserId, key, limit, increment } = payload;

    const { data: current } = await (await import('@/lib/supabaseServer')).createSupabaseServerClient({ serviceRole: true })
      .from('usage_counters')
      .select('count')
      .eq('user_id', legacyUserId)
      .eq('feature', key)
      .eq('period_utc_date', today)
      .maybeSingle<{ count: number }>();

    const currentCount = current?.count ?? 0;
    const nextCount = increment ? currentCount + 1 : currentCount;

    if (increment) {
      await (await import('@/lib/supabaseServer')).createSupabaseServerClient({ serviceRole: true })
        .from('usage_counters')
        .upsert({
          user_id: legacyUserId,
          feature: key,
          period_utc_date: today,
          count: nextCount,
        }, { onConflict: 'user_id,feature,period_utc_date' });
    }

    const allowed = nextCount < limit;
    return { allowed, used: nextCount, count: nextCount, limit, remaining: Math.max(0, limit - nextCount) };
  }

  const sb = arg1 as SupabaseClient<Database>;
  const uid = userId as string;
  const ft = feature as Feature;
  const plan = await getUserPlanForUsage(sb, uid);
  const limit = getLimitForPlanAndFeature(plan, ft);
  const today = await getTodayUsage(sb, uid, ft);
  const used = today?.requests ?? 0;
  return { allowed: used < limit, used, count: used, limit, remaining: Math.max(0, limit - used) };
}

export async function incrementUsage(
  arg1: SupabaseClient<Database> | string,
  userIdOrFeature: string,
  featureOrTokens?: Feature | number,
  tokens = 0,
): Promise<UsageRecord | number> {
  if (typeof arg1 === 'string') {
    const legacyUserId = arg1;
    const key = userIdOrFeature;
    const today = todayISO();
    const service = (await import('@/lib/supabaseServer')).createSupabaseServerClient({ serviceRole: true });
    const { data: current } = await service
      .from('usage_counters')
      .select('count')
      .eq('user_id', legacyUserId)
      .eq('feature', key)
      .eq('period_utc_date', today)
      .maybeSingle<{ count: number }>();
    const next = (current?.count ?? 0) + 1;
    await service.from('usage_counters').upsert({ user_id: legacyUserId, feature: key, period_utc_date: today, count: next }, { onConflict: 'user_id,feature,period_utc_date' });
    return next;
  }

  const supabase = arg1;
  const userId = userIdOrFeature;
  const feature = featureOrTokens as Feature;
  const tokenCount = typeof featureOrTokens === 'number' ? featureOrTokens : tokens;

  const current = await getTodayUsage(supabase, userId, feature);
  if (!current) {
    const { data, error } = await supabase
      .from('usage_tracking')
      .insert({ user_id: userId, feature, date: todayISO(), requests: 1, tokens: Math.max(0, tokenCount) })
      .select('id, user_id, feature, requests, tokens, date, created_at, updated_at')
      .single();
    if (error) throw error;
    return data as UsageRecord;
  }

  const { data, error } = await supabase
    .from('usage_tracking')
    .update({ requests: current.requests + 1, tokens: current.tokens + Math.max(0, tokenCount), updated_at: new Date().toISOString() })
    .eq('id', current.id)
    .select('id, user_id, feature, requests, tokens, date, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as UsageRecord;
}

export async function getUsagePercentage(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: Feature,
): Promise<UsageGuardResult> {
  const { used, limit } = await checkLimit(supabase, userId, feature);
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    percentage: toPercentage(used, limit),
    feature,
  };
}

export async function guardAIRequest(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: Feature,
  tokens = 0,
): Promise<UsageGuardResult> {
  const limit = await checkLimit(supabase, userId, feature);
  if (!limit.allowed) {
    const err = new Error('usage_limit_reached');
    (err as Error & { status?: number }).status = 429;
    throw err;
  }

  const next = (await incrementUsage(supabase, userId, feature, tokens)) as UsageRecord;
  const remaining = Math.max(0, limit.limit - next.requests);

  return {
    used: next.requests,
    limit: limit.limit,
    remaining,
    percentage: toPercentage(next.requests, limit.limit),
    feature,
  };
}

async function authHeader(): Promise<Record<string, string>> {
  try {
    const { supabaseBrowser } = await import('@/lib/supabaseBrowser');
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const base = typeof window === 'undefined' ? env.SITE_URL || env.NEXT_PUBLIC_BASE_URL || '' : '';

export async function increment(key: UsageKey, step = 1, dateISO = todayISO()): Promise<IncrementRes> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    };

    const r = await fetch(`${base}/api/counters/increment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key, step, dateISO } satisfies IncrementReq),
    });

    return (await r.json()) as IncrementRes;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'network_error';
    return { ok: false, error: message };
  }
}

export async function getCount(key: UsageKey, dateISO = todayISO()): Promise<number> {
  const res = await increment(key, 0, dateISO);
  return res.ok ? res.count : 0;
}

export async function canUse(key: UsageKey, limit: number): Promise<UsageDecision> {
  const res = await increment(key, 0);

  const count = res.ok ? res.count : 0;
  const remaining = Math.max(0, limit - count);

  if (!res.ok) {
    return {
      allowed: false,
      count,
      limit,
      remaining,
      reason: 'counter_unavailable',
    };
  }

  const allowed = count < limit;

  return {
    allowed,
    count,
    limit,
    remaining,
    reason: allowed ? undefined : 'limit_reached',
  };
}

export async function ensureUsageAllowed(key: UsageKey, limit: number): Promise<UsageDecision> {
  const decision = await canUse(key, limit);

  if (!decision.allowed) {
    throw new Error(decision.reason === 'limit_reached' ? 'usage_limit_reached' : 'usage_unavailable');
  }

  return decision;
}

export async function incrementLegacyUsage(key: UsageKey, step = 1): Promise<number> {
  const res = await increment(key, step);

  if (!res.ok) {
    throw new Error(res.error || 'usage_increment_failed');
  }

  return res.count;
}

export function limitExceeded(error: string, limit: number): LimitExceededPayload {
  return { error, limit };
}

export async function checkLegacyLimit(key: UsageKey, limit: number): Promise<boolean> {
  const decision = await canUse(key, limit);
  return decision.allowed;
}
