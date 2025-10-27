// lib/api/withPlan.ts
// Subscription / role guard for API routes with flag-aware kill switches.

import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';

import { getServerClient } from '@/lib/supabaseServer';
import { hasPlan } from '@/lib/planAccess';
import type { PlanId } from '@/types/pricing';
import { flags, resolveFlags, serverEnabled, type FlagAudience, type FeatureFlagKey } from '@/lib/flags';

export type PlanGuardAudience = FlagAudience & {
  plan: PlanId;
  role: string | null;
  userId: string;
};

export type PlanGuardContext = {
  user: User;
  plan: PlanId;
  role: string | null;
  supabase: ReturnType<typeof getServerClient>;
  audience: PlanGuardAudience;
  flags: Record<string, boolean>;
};

type AllowedRole = 'admin' | 'teacher';

export type PlanGuardOptions = {
  allowRoles?: AllowedRole[];
  killSwitchFlag?: FeatureFlagKey;
};

function normalisePlan(raw?: string | null): PlanId {
  if (!raw) return 'free';
  const value = raw.toLowerCase();
  if (value === 'starter' || value === 'booster' || value === 'master') return value;
  return 'free';
}

function buildAudience(user: User, plan: PlanId, role: string | null): PlanGuardAudience {
  return {
    plan,
    role,
    userId: user.id,
  };
}

async function loadProfilePlan(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
): Promise<{ plan: PlanId; role: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { plan: 'free', role: null };
  }

  const plan = normalisePlan((data as { plan?: string | null }).plan ?? null);
  const role = ((data as { role?: string | null }).role ?? null) as string | null;
  return { plan, role };
}

async function checkKillSwitch(
  flagKey: FeatureFlagKey | undefined,
  audience: PlanGuardAudience,
): Promise<boolean> {
  if (!flagKey) return false;
  try {
    const enabled = await serverEnabled(flagKey, audience);
    return enabled;
  } catch (error) {
    console.error('[withPlan] kill switch lookup failed', error);
    // Fail closed if flags subsystem unavailable.
    return true;
  }
}

function deny(res: NextApiResponse, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

export function withPlan(
  required: PlanId,
  handler: (req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) => unknown | Promise<unknown>,
  options: PlanGuardOptions = {},
): NextApiHandler {
  return async function guarded(req, res) {
    const supabase = getServerClient(req, res);

    if (required === 'free') {
      const flagsSnapshot = flags.snapshot();
      return handler(req, res, {
        supabase,
        user: null as unknown as User,
        plan: 'free',
        role: null,
        audience: { plan: 'free', role: null, userId: 'anonymous' },
        flags: flagsSnapshot,
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      deny(res, 401, { error: 'Not authenticated', requiredPlan: required });
      return;
    }

    const { plan, role } = await loadProfilePlan(supabase, user.id);
    const audience = buildAudience(user, plan, role);

    const allowRoles = new Set<AllowedRole>([...(options.allowRoles ?? []), 'admin']);
    if (required === 'master') {
      allowRoles.add('teacher');
    }

    if (role && allowRoles.has(role as AllowedRole)) {
      const flagsSnapshot = await resolveFlags(audience);
      await handler(req, res, { user, plan, role, supabase, audience, flags: flagsSnapshot });
      return;
    }

    if (!hasPlan(plan, required)) {
      res.setHeader('X-Required-Plan', required);
      deny(res, 402, {
        error: 'Upgrade required',
        requiredPlan: required,
        currentPlan: plan,
        upgradeUrl: `/pricing?required=${required}`,
      });
      return;
    }

    if (await checkKillSwitch(options.killSwitchFlag, audience)) {
      deny(res, 503, {
        error: 'Temporarily unavailable',
        reason: 'Feature disabled by kill-switch',
        flag: options.killSwitchFlag,
      });
      return;
    }

    const flagsSnapshot = await resolveFlags(audience);
    await handler(req, res, { user, plan, role, supabase, audience, flags: flagsSnapshot });
  };
}

