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

export type LimitExceededPayload = { error: string; limit: number };

export function todayISO(d = new Date()) {
  // YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

/* --------------------------------------------------------
   Auth Helper
-------------------------------------------------------- */

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

/* --------------------------------------------------------
   API Base URL
-------------------------------------------------------- */

const base =
  typeof window === 'undefined'
    ? env.SITE_URL || env.NEXT_PUBLIC_BASE_URL || ''
    : '';

/* --------------------------------------------------------
   Core API Call
-------------------------------------------------------- */

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

/* --------------------------------------------------------
   Read-only count (step=0)
-------------------------------------------------------- */

export async function getCount(
  key: UsageKey,
  dateISO = todayISO(),
): Promise<number> {
  const res = await increment(key, 0, dateISO);
  return res.ok ? res.count : 0;
}

/* --------------------------------------------------------
   Guard: can I use?
-------------------------------------------------------- */

export async function canUse(
  key: UsageKey,
  limit: number,
): Promise<UsageDecision> {
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

/* --------------------------------------------------------
   Strict guard (throws)
-------------------------------------------------------- */

export async function ensureUsageAllowed(
  key: UsageKey,
  limit: number,
): Promise<UsageDecision> {
  const decision = await canUse(key, limit);

  if (!decision.allowed) {
    throw new Error(
      decision.reason === 'limit_reached'
        ? 'usage_limit_reached'
        : 'usage_unavailable',
    );
  }

  return decision;
}

/* --------------------------------------------------------
   Increment wrapper (public)
-------------------------------------------------------- */

export async function incrementUsage(
  key: UsageKey,
  step = 1,
): Promise<number> {
  const res = await increment(key, step);

  if (!res.ok) {
    throw new Error(res.error || 'usage_increment_failed');
  }

  return res.count;
}

/* --------------------------------------------------------
   Error helper
-------------------------------------------------------- */

export function limitExceeded(
  error: string,
  limit: number,
): LimitExceededPayload {
  return { error, limit };
}