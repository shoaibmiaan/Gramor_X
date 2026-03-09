// lib/apiGuard.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { normalizePlan } from '@/lib/subscription';
import { PLAN_RANK, type PlanId } from '@/types/pricing';

type Role = 'user' | 'admin' | 'teacher' | 'org' | null;

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

    // Read profile (RLS should allow user to read own profile)
    type ProfileRow = { id: string; plan: PlanId | null; role: Role };
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, plan, role')
      .eq('id', user.id)
      .single<ProfileRow>();

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
    const currentPlan: PlanId = normalizePlan(profile.plan);
    if (PLAN_RANK[currentPlan] >= PLAN_RANK[required]) {
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

