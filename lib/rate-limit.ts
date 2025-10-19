// lib/rate-limit.ts
// Simple in-memory rate limiter for API routes. Stores counters per key with a reset window.

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Increment the usage counter for a given key.
 * Returns whether the caller is rate limited after this increment.
 */
export function touchRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    const next: Entry = { count: 1, resetAt };
    buckets.set(key, next);
    return { limited: limit <= 0, remaining: Math.max(limit - 1, 0), resetAt };
  }

  existing.count += 1;
  buckets.set(key, existing);
  const limited = existing.count > limit;
  return { limited, remaining: Math.max(limit - existing.count, 0), resetAt: existing.resetAt };
}

/** Convenience helper to clear a bucket (used in tests). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
