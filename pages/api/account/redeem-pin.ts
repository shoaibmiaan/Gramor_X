// pages/api/account/redeem-pin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { env } from '@/lib/env';
import { getServerClient } from '@/lib/supabaseServer';
import { getAdminClient } from '@/lib/supabaseAdmin';

type Plan = 'starter' | 'booster' | 'master';

type Success = Readonly<{
  ok: true;
  plan: Plan;
  premiumExpiresAt: string;
}>;

type Failure = Readonly<{
  ok: false;
  error: string;
  remainingAttempts?: number;
}>;

type ResponseBody = Success | Failure;

const Body = z.object({
  pin: z
    .string()
    .trim()
    .min(4, 'PIN must be at least 4 digits')
    .max(64, 'PIN is too long')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
});

// Basic in-memory rate limiting (per node/process)
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
  existing.count += 1;
  attemptsByUser.set(userId, existing);
  return { limited: existing.count >= RATE_MAX, remaining: Math.max(RATE_MAX - existing.count, 0) };
}

function clearFailures(userId: string) {
  attemptsByUser.delete(userId);
}

const PLAN_KEYS = new Set<Plan>(['starter', 'booster', 'master']);

function resolvePlan(row: Record<string, unknown>): Plan {
  const candidates = [row.plan, row.plan_key, row.planId, row.membership, row.tier];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const lower = candidate.toLowerCase();
      if (PLAN_KEYS.has(lower as Plan)) return lower as Plan;
    }
  }
  // Default plan if unspecified
  return 'booster';
}

function resolveDurationDays(row: Record<string, unknown>): number {
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
  return 30; // default 30 days
}

function resolveExpiry(row: Record<string, unknown>): Date | null {
  const keys = ['expires_at', 'valid_until', 'redeem_by'] as const;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    } else if (typeof value === 'number') {
      // Detect ms vs s reliably: current ms epoch ~ 1e12; seconds ~ 1e9
      const isMs = value >= 1e11 || `${Math.trunc(value)}`.length >= 12;
      return new Date(isMs ? value : value * 1000);
    }
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Auth (server-side supabase client tied to req/res cookies)
  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  // Validate body
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    const [{ message }] = parsed.error.issues;
    return res.status(400).json({ ok: false, error: message });
  }

  // Rate window check (per-process)
  const current = attemptsByUser.get(user.id);
  if (current && current.resetAt > Date.now() && current.count >= RATE_MAX) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Try again later.' });
  }

  const admin = getAdminClient();

  // Look up the user's PIN row (per your table design)
  const { data: pinRow, error: fetchError } = await admin
    .from('premium_pins')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ ok: false, error: 'pin_lookup_failed' });
  }

  if (!pinRow) {
    const { limited, remaining } = registerFailure(user.id);
    if (limited) res.setHeader('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000).toString());
    return res
      .status(limited ? 429 : 400)
      .json({ ok: false, error: 'Invalid or expired PIN.', remainingAttempts: remaining });
  }

  // Ensure the row has a hash
  const { pin_hash } = pinRow as Record<string, unknown>;
  if (typeof pin_hash !== 'string' || pin_hash.length === 0) {
    return res.status(500).json({ ok: false, error: 'pin_misconfigured' });
  }

  // Check expiry (if present)
  const expiresAt = resolveExpiry(pinRow as Record<string, unknown>);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    const { limited, remaining } = registerFailure(user.id);
    if (limited) res.setHeader('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000).toString());
    return res
      .status(limited ? 429 : 400)
      .json({ ok: false, error: 'Invalid or expired PIN.', remainingAttempts: remaining });
  }

  // Compare against provided PIN
  const isMatch = await bcrypt.compare(parsed.data.pin, pin_hash);
  if (!isMatch) {
    const { limited, remaining } = registerFailure(user.id);
    if (limited) res.setHeader('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000).toString());
    return res
      .status(limited ? 429 : 400)
      .json({ ok: false, error: 'Invalid or expired PIN.', remainingAttempts: remaining });
  }

  // Success: clear rate limiter
  clearFailures(user.id);

  // Determine plan & duration
  const plan = resolvePlan(pinRow as Record<string, unknown>);
  const grantDays = resolveDurationDays(pinRow as Record<string, unknown>);

  // Compute premium end date (UTC)
  const premiumUntil = new Date();
  premiumUntil.setUTCDate(premiumUntil.getUTCDate() + grantDays);

  // Update user profile (uses admin client to avoid RLS snags)
  await admin
    .from('user_profiles') // NOTE: your schema predominantly references `user_profiles`
    .update({
      membership: plan,
      premium_until: premiumUntil.toISOString(),
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Invalidate the PIN so it can't be reused
  await admin.from('premium_pins').delete().eq('user_id', user.id);

  // (Best-effort) audit trail
  try {
    await admin.from('payment_events').insert([
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
    // non-fatal
  }

  return res
    .status(200)
    .json({ ok: true, plan, premiumExpiresAt: premiumUntil.toISOString() });
}
