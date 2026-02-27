// lib/apiGuard.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { getProfilePlanAndRole } from '@/lib/repositories/profileRepository';
import { getUserEffectivePlan } from '@/lib/repositories/subscriptionRepository';

type PlanId = 'free' | 'starter' | 'booster' | 'master';
const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  booster: 2,
  master: 3,
};

type GuardOptions = {
  /** Additional roles that should bypass the plan check */
  allowRoles?: Array<'admin' | 'teacher'>;
};

/**
 * Wrap a Next.js API handler with a subscription/plan guard.
 * - `free` → allows public/unauthenticated access.
 * - other plans → require auth; compare user's effective plan to required.
 * - For `master` routes, admins/teachers are allowed by default.
 */
export function withPlan(
  required: PlanId,
  handler: NextApiHandler,
  options: GuardOptions = {}
) {
  return async function wrapped(req: NextApiRequest, res: NextApiResponse) {
    // Public endpoints
    if (required === 'free') return handler(req, res);

    const supabase = getServerClient(req, res);

    // Must be authenticated for non-free
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (authErr || !user) {
      res.status(401).json({
        error: 'Not authenticated',
        requiredPlan: required,
      });
      return;
    }

    const [{ data: profile, error: profileErr }, effectivePlan] = await Promise.all([
      getProfilePlanAndRole(supabase, user.id),
      getUserEffectivePlan(supabase, user.id),
    ]);

    if (profileErr || !profile) {
      res.status(500).json({ error: 'Profile lookup failed' });
      return;
    }

    // Role bypass (admins/teachers → always OK for master-gated endpoints)
    const defaultRoleBypass =
      required === 'master' ? (['admin', 'teacher'] as const) : [];
    const allowRoles = new Set([
      ...defaultRoleBypass,
      ...(options.allowRoles ?? []),
    ]);

    if (profile.role && allowRoles.has(profile.role as 'admin' | 'teacher')) {
      return handler(req, res);
    }

    // Compare plans
    const currentPlan: PlanId = effectivePlan.plan;
    if (PLAN_ORDER[currentPlan] >= PLAN_ORDER[required]) {
      return handler(req, res);
    }

    res.setHeader('X-Required-Plan', required);
    res.status(402).json({
      error: 'Upgrade required',
      requiredPlan: required,
      currentPlan,
      upgradeUrl: `/pricing?required=${required}`,
    });
  };
}
