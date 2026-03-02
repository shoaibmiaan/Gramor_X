// lib/usage.ts
import { env } from './env';

export type UsageKey =
  | 'ai.writing.grade'
  | 'ai.speaking.grade'
  | 'ai.explain'
  | 'mock.start'
  | 'mock.submit';

export type IncrementReq = { key: UsageKey; step?: number; dateISO?: string };
export type IncrementRes =
  | { ok: true; key: UsageKey; dateISO: string; count: number }
  | { ok: false; error: string };

export type UsageDecision = {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  reason?: 'limit_reached' | 'counter_unavailable';
};

export function todayISO(d = new Date()) {
  // YYYY-MM-DD in UTC (server groups by calendar day)
  return d.toISOString().slice(0, 10);
}

const DAILY_EXPIRY_SECONDS = 60 * 60 * 24;

export type LimitExceededPayload = { error: string; limit: number };

function usageKey(userId: string, key: string, dateISO = todayISO()) {
  return `${key}:${userId}:${dateISO}`;
}

export async function getTodayUsage(userId: string, key: string, dateISO = todayISO()): Promise<number> {
  try {
    const { redis } = await import('@/lib/redis');
    const raw = await redis.get(usageKey(userId, key, dateISO));
    const value = raw ? Number.parseInt(raw, 10) : 0;
    if (Number.isNaN(value)) {
      await redis.del(usageKey(userId, key, dateISO));
      return 0;
    }
    return value;
  } catch {
    return 0;
  }
}

export async function incrementUsage(userId: string, key: string, dateISO = todayISO()): Promise<number> {
  const { redis } = await import('@/lib/redis');
  const scopedKey = usageKey(userId, key, dateISO);
  const next = await redis.incr(scopedKey);
  if (next === 1) {
    await redis.expire(scopedKey, DAILY_EXPIRY_SECONDS);
  }
  return next;
}

export async function checkLimit(input: {
  userId: string;
  key: string;
  limit: number;
  increment?: boolean;
  dateISO?: string;
}): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { userId, key, limit, increment = false, dateISO = todayISO() } = input;
  const current = increment
    ? await incrementUsage(userId, key, dateISO)
    : await getTodayUsage(userId, key, dateISO);

  return {
    allowed: increment ? current <= limit : current < limit,
    current,
    limit,
  };
}

export function limitExceeded(error: string, limit: number): LimitExceededPayload {
  return { error, limit };
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

export async function increment(
  key: UsageKey,
  step = 1,
  dateISO = todayISO(),
): Promise<IncrementRes> {
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
    const j = (await r.json()) as IncrementRes;
    return j;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network_error' };
  }
}

/** Read-only count without incrementing (step=0). */
export async function getCount(key: UsageKey, dateISO = todayISO()): Promise<number> {
  const res = await increment(key, 0, dateISO);
  return res.ok ? res.count : 0;
}

/** Quick “can I use this?” guard. */
export async function canUse(key: UsageKey, limit: number): Promise<UsageDecision> {
  // Step=0 returns current count without increment (API supports it).
  const res = await increment(key, 0);
  const count = res.ok ? res.count : 0;
  const remaining = Math.max(0, limit - count);
  if (!res.ok) {
    return { allowed: false, count, limit, remaining, reason: 'counter_unavailable' };
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
    throw new Error(
      decision.reason === 'limit_reached' ? 'usage_limit_reached' : 'usage_unavailable',
    );
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
