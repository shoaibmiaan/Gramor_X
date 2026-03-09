// lib/apiGuard.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { getUserPlan, getActiveSubscription, requireActiveSubscription, inactiveSubscriptionResponse, InactiveSubscriptionError } from '@/lib/subscription';
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
    type ProfileRow = { id: string; role: Role };
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, role')
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
    const currentSubscription = await getActiveSubscription(user.id);
    try {
      const active = await requireActiveSubscription(user.id);
      if (PLAN_RANK[active.plan] >= PLAN_RANK[required]) {
        return handler(req, res);
      }
    } catch (error) {
      if (error instanceof InactiveSubscriptionError) {
        res.setHeader('X-Required-Plan', required);
        const inactive = inactiveSubscriptionResponse(currentSubscription, required);
        return res.status(inactive.statusCode).json(inactive.payload);
      }
      throw error;
    }

    res.setHeader('X-Required-Plan', required);
    const currentPlan: PlanId = await getUserPlan(user.id);
    const inactive = inactiveSubscriptionResponse({ plan: currentPlan, status: currentSubscription.status }, required);
    res.status(inactive.statusCode).json(inactive.payload);
  };
}

