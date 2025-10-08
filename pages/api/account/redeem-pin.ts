// pages/api/account/redeem-pin.ts
import bcrypt from 'bcryptjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { env } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

type Success = Readonly<{
  ok: true;
  plan: 'starter' | 'booster' | 'master';
  premiumExpiresAt: string;
}>;

type Failure = Readonly<{
  ok: false;
  error: string;
  remainingAttempts?: number;
}>;

type ResponseBody = Success | Failure;

const schema = z.object({
  pin: z
    .string()
    .trim()
    .min(4, 'PIN must be at least 4 digits')
    .max(64, 'PIN is too long')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
});

const RATE_MAX = Number(env.PREMIUM_PIN_RATE || 5) || 5;
const RATE_WINDOW_MS = (Number(env.PREMIUM_PIN_WINDOW_SEC || 900) || 900) * 1000;

type AttemptState = { count: number; resetAt: number };
const attemptsByUser = new Map<string, AttemptState>();

function registerFailure(userId: string) {
  const now = Date.now();
  const existing = attemptsByUser.get(userId);

  if (!existing || existing.resetAt <= now) {
    const entry: AttemptState = { count: 1, resetAt: now + RATE_WINDOW_MS };
    attemptsByUser.set(userId, entry);
    return { limited: entry.count >= RATE_MAX, remaining: Math.max(RATE_MAX - entry.count, 0) };
  }

  const next = existing.count + 1;
  existing.count = next;
  attemptsByUser.set(userId, existing);

  return { limited: next >= RATE_MAX, remaining: Math.max(RATE_MAX - next, 0) };
}

function clearFailures(userId: string) {
  attemptsByUser.delete(userId);
}

const PLAN_KEYS = new Set(['starter', 'booster', 'master']);

function resolvePlan(row: Record<string, any>): 'starter' | 'booster' | 'master' {
  const candidates = [row.plan, row.plan_key, row.planId, row.membership, row.tier];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const lower = candidate.toLowerCase();
      if (PLAN_KEYS.has(lower)) return lower as 'starter' | 'booster' | 'master';
    }
  }
  return 'booster';
}

function resolveDurationDays(row: Record<string, any>) {
  const dayCandidates = [row.grant_days, row.duration_days, row.valid_days, row.days, row.access_days];
  for (const candidate of dayCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return Math.floor(candidate);
    }
  }

  const monthCandidates = [row.grant_months, row.duration_months, row.months];
  for (const candidate of monthCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return Math.floor(candidate * 30);
    }
  }

  return 30; // Default 30-day access window
}

function resolveExpiry(row: Record<string, any>) {
  const keys = ['expires_at', 'valid_until', 'redeem_by'];
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    } else if (typeof value === 'number') {
      return new Date(value * (value > 1_000_000_000 ? 1 : 1000));
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const [{ message }] = parsed.error.issues;
    return res.status(400).json({ ok: false, error: message });
  }

  const pin = parsed.data.pin;
  const rateInfo = attemptsByUser.get(user.id);
  if (rateInfo && rateInfo.resetAt > Date.now() && rateInfo.count >= RATE_MAX) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Try again later.' });
  }

  const service = createSupabaseServerClient({ serviceRole: true });

  const { data: pinRow, error: fetchError } = await service
    .from('premium_pins')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ ok: false, error: 'pin_lookup_failed' });
  }

  if (!pinRow) {
    const { limited, remaining } = registerFailure(user.id);
    const status = limited ? 429 : 400;
    if (limited) res.setHeader('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000).toString());
    return res
      .status(status)
      .json({ ok: false, error: 'Invalid or expired PIN.', remainingAttempts: remaining });
  }

  if (typeof pinRow.pin_hash !== 'string' || pinRow.pin_hash.length === 0) {
    return res.status(500).json({ ok: false, error: 'pin_misconfigured' });
  }

  const expiresAt = resolveExpiry(pinRow as Record<string, any>);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    const { limited, remaining } = registerFailure(user.id);
    const status = limited ? 429 : 400;
    if (limited) res.setHeader('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000).toString());
    return res
      .status(status)
      .json({ ok: false, error: 'Invalid or expired PIN.', remainingAttempts: remaining });
  }

  const match = await bcrypt.compare(pin, pinRow.pin_hash as string);
  if (!match) {
    const { limited, remaining } = registerFailure(user.id);
    const status = limited ? 429 : 400;
    if (limited) res.setHeader('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000).toString());
    return res
      .status(status)
      .json({ ok: false, error: 'Invalid or expired PIN.', remainingAttempts: remaining });
  }

  clearFailures(user.id);

  const plan = resolvePlan(pinRow as Record<string, any>);
  const grantDays = resolveDurationDays(pinRow as Record<string, any>);
  const premiumUntil = new Date();
  premiumUntil.setUTCDate(premiumUntil.getUTCDate() + grantDays);

  await service
    .from('profiles')
    .update({
      membership: plan,
      premium_until: premiumUntil.toISOString(),
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Ensure PIN cannot be reused.
  await service.from('premium_pins').delete().eq('user_id', user.id);

  try {
    await service.from('payment_events').insert([
      {
        provider: 'stripe',
        status: 'premium_pin.redeemed',
        user_id: user.id,
        metadata: {
          plan,
          grantDays,
          premiumUntil: premiumUntil.toISOString(),
          source: 'premium_pin',
        },
      },
    ]);
  } catch {
    /* non-fatal */
  }

  return res.status(200).json({ ok: true, plan, premiumExpiresAt: premiumUntil.toISOString() });
}
