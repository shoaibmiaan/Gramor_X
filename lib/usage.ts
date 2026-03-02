// lib/usage.ts
import { env } from './env';
import type {
  IncrementReq,
  IncrementRes,
  LimitExceededPayload,
  UsageDecision,
  UsageKey,
} from '@/types/usage';

export type { IncrementReq, IncrementRes, LimitExceededPayload, UsageDecision, UsageKey };

export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
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

export async function incrementUsage(key: UsageKey, step = 1): Promise<number> {
  const res = await increment(key, step);

  if (!res.ok) {
    throw new Error(res.error || 'usage_increment_failed');
  }

  return res.count;
}

export function limitExceeded(error: string, limit: number): LimitExceededPayload {
  return { error, limit };
}

export async function checkLimit(key: UsageKey, limit: number): Promise<boolean> {
  const decision = await canUse(key, limit);
  return decision.allowed;
}
