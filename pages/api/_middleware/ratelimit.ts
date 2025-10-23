import type { NextApiRequest, NextApiResponse } from 'next';

import { applyRateLimit } from '@/lib/limits/rate';

const MATCHERS: Array<{ pattern: RegExp; windowMs: number; max: number }> = [
  { pattern: /^\/api\/ai\/writing\//, windowMs: 60_000, max: 12 },
  { pattern: /^\/api\/ai\/speaking\//, windowMs: 60_000, max: 10 },
  { pattern: /^\/api\/share\//, windowMs: 120_000, max: 8 },
  { pattern: /^\/api\/auth\//, windowMs: 60_000, max: 15 },
];

export async function enforceApiRateLimit(req: NextApiRequest, res: NextApiResponse) {
  const pathname = req.url ?? '';
  const rule = MATCHERS.find((entry) => entry.pattern.test(pathname));
  if (!rule) return true;

  const identifier = `${req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown'}:${pathname}`;
  const result = await applyRateLimit(
    { route: rule.pattern.source, identifier, userId: (req as any).userId ?? null },
    { windowMs: rule.windowMs, max: rule.max },
  );

  res.setHeader('X-RateLimit-Limit', String(rule.max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));

  if (result.blocked) {
    if (result.retryAfter) {
      res.setHeader('Retry-After', String(result.retryAfter));
    }
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }

  return true;
}

