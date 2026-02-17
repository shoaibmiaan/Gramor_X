import type { NextApiRequest, NextApiResponse } from 'next';
import { redis } from './redis';

const WINDOW_SEC = Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60); // default 60s
const MAX_REQ = Number(process.env.RATE_LIMIT_MAX ?? 5); // default 5 requests per window

export type RateLimitOptions = {
  /** Optional bucket identifier so different routes have isolated counters. */
  key?: string;
  /** Authenticated user to scope limits per account as well as IP. */
  userId?: string | null;
};

function getClientIp(req: NextApiRequest): string {
  const xf = (req.headers?.['x-forwarded-for'] as string | undefined)
    ?.split(',')[0]
    ?.trim();
  return xf || req.socket?.remoteAddress || 'unknown';
}

function buildKey({ ip, options }: { ip: string; options?: RateLimitOptions }): string {
  const parts = ['rl'];
  if (options?.key) {
    parts.push(options.key.replace(/[:\s]/g, '_'));
  }
  if (options?.userId) {
    parts.push(`user_${options.userId}`);
  }
  parts.push(`ip_${ip}`);
  return parts.join('::');
}

export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: RateLimitOptions,
): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') return true;
  const ip = getClientIp(req);
  const key = buildKey({ ip, options });
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SEC);
  }

  if (typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit', MAX_REQ.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQ - count).toString());
  }

  if (count > MAX_REQ) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', WINDOW_SEC.toString());
    }
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  return true;
}
