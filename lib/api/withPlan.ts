// lib/api/withPlan.ts
// Subscription / role guard for API routes with flag-aware kill switches.

import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';

import { getServerClient } from '@/lib/supabaseServer';
import { hasPlan } from '@/lib/planAccess';
import {
  getUserPlan,
  getActiveSubscription,
  requireActiveSubscription,
  InactiveSubscriptionError,
  inactiveSubscriptionResponse,
  type SubscriptionStatus,
} from '@/lib/subscription';
import type { PlanId } from '@/types/pricing';
import { resolveFlags, serverEnabled, type FlagAudience, type FeatureFlagKey } from '@/lib/flags';

export type PlanGuardAudience = FlagAudience & {
  plan: PlanId;
  role: string | null;
  userId: string;
};

export type PlanGuardContext = {
  user: User;
  plan: PlanId;
  role: string | null;
  subscriptionStatus: SubscriptionStatus;
  supabase: ReturnType<typeof getServerClient>;
  audience: PlanGuardAudience;
  flags: Record<string, boolean>;
};

type AllowedRole = 'admin' | 'teacher';

export type PlanGuardOptions = {
  allowRoles?: AllowedRole[];
  killSwitchFlag?: FeatureFlagKey;
};

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
): Promise<{ plan: PlanId; role: string | null; status: SubscriptionStatus }> {
  const [{ data, error }, sub] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle(),
    getActiveSubscription(userId),
  ]);

  const plan = await getUserPlan(userId);
  if (error || !data) {
    return { plan, role: null, status: sub.status };
  }

  const role = ((data as { role?: string | null }).role ?? null) as string | null;
  return { plan, role, status: sub.status };
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

    const ensureContext = async (): Promise<PlanGuardContext | null> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        deny(res, 500, { error: 'Auth error', details: authError.message });
        return null;
      }

      if (!user) {
        deny(res, 401, { error: 'Not authenticated', requiredPlan: required });
        return null;
      }

      const { plan, role, status } = await loadProfilePlan(supabase, user.id);
      const audience = buildAudience(user, plan, role);
      const flagsSnapshot = await resolveFlags(audience);

      return { supabase, user, plan, role, subscriptionStatus: status, audience, flags: flagsSnapshot };
    };

    const allowRoles = new Set<AllowedRole>([...(options.allowRoles ?? []), 'admin']);
    if (required === 'master') {
      allowRoles.add('teacher');
    }

    if (required === 'free') {
      const context = await ensureContext();
      if (!context) return;

      if (context.role && allowRoles.has(context.role as AllowedRole)) {
        await handler(req, res, context);
        return;
      }

      await handler(req, res, context);
      return;
    }

    const context = await ensureContext();
    if (!context) return;

    if (context.role && allowRoles.has(context.role as AllowedRole)) {
      await handler(req, res, context);
      return;
    }

    try {
      await requireActiveSubscription(context.user.id);
    } catch (error) {
      if (error instanceof InactiveSubscriptionError) {
        res.setHeader('X-Required-Plan', required);
        const inactive = inactiveSubscriptionResponse({ plan: context.plan, status: context.subscriptionStatus }, required);
        deny(res, inactive.statusCode, inactive.payload);
        return;
      }
      throw error;
    }

    if (!hasPlan(context.plan, required)) {
      res.setHeader('X-Required-Plan', required);
      const inactive = inactiveSubscriptionResponse({ plan: context.plan, status: context.subscriptionStatus }, required);
      deny(res, inactive.statusCode, inactive.payload);
      return;
    }

    if (await checkKillSwitch(options.killSwitchFlag, context.audience)) {
      deny(res, 503, {
        error: 'Temporarily unavailable',
        reason: 'Feature disabled by kill-switch',
        flag: options.killSwitchFlag,
      });
      return;
    }

    await handler(req, res, context);
  };
}

