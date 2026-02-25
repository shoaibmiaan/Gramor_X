// lib/limits/rate.ts
// Sliding-window Redis rate limiter shared across API routes.

import { redis } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type RateLimitScope = {
  route: string;
  identifier: string;
  userId?: string | null;
};

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  blocked: boolean;
  hits: number;
  remaining: number;
  retryAfter?: number;
  resetAt: number;
  windowMs: number;
};

const MIN_WINDOW_MS = 1000;

async function logBlock(scope: RateLimitScope, hits: number, windowSeconds: number) {
  if (!scope.userId || !supabaseAdmin) return;
  try {
    await supabaseAdmin.from('api_abuse_log').insert({
      user_id: scope.userId,
      route: scope.route,
      hits,
      window: `${windowSeconds}s`,
    });
  } catch (error) {
    console.warn('[rate-limit] failed to insert abuse log', error);
  }
}

function bucketKey(scope: RateLimitScope, bucket: number): string {
  return `rl:${scope.route}:${scope.identifier}:${bucket}`;
}

export async function applyRateLimit(
  scope: RateLimitScope,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowMs = Math.max(MIN_WINDOW_MS, Math.floor(options.windowMs));
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const key = bucketKey(scope, bucket);
  const prevKey = bucketKey(scope, bucket - 1);
  const ttlSeconds = Math.ceil(windowMs / 1000) * 2;

  const hits = await redis.incr(key);
  if (hits === 1) {
    await redis.expire(key, ttlSeconds);
  }

  const prevRaw = await redis.get(prevKey);
  const prevHits = prevRaw ? Number(prevRaw) || 0 : 0;
  const timeIntoWindow = now % windowMs;
  const prevWeight = (windowMs - timeIntoWindow) / windowMs;
  const effectiveHits = hits + prevHits * prevWeight;

  const blocked = effectiveHits > options.max;
  const remaining = blocked ? 0 : Math.max(0, Math.floor(options.max - effectiveHits));
  const resetAt = now - timeIntoWindow + windowMs;
  const retryAfter = blocked ? Math.ceil((resetAt - now) / 1000) : undefined;

  if (blocked) {
    await logBlock(scope, hits + prevHits, Math.ceil(windowMs / 1000));
  }

  return {
    blocked,
    hits,
    remaining,
    retryAfter,
    resetAt,
    windowMs,
  };
}

