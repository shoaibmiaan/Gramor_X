import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { resolveUserPlan } from '@/lib/plan/resolveUserPlan';
import type { PlanId } from '@/types/pricing';

const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  booster: 2,
  master: 3,
};

export type UserEntitlement = {
  userId: string;
  role: string | null;
  plan: PlanId;
};

function normalizePlan(plan: string | null | undefined): PlanId {
  const v = String(plan ?? 'free').toLowerCase();
  if (v === 'starter' || v === 'booster' || v === 'master') return v;
  return 'free';
}

export async function getUserEntitlement(req: NextApiRequest, res: NextApiResponse): Promise<UserEntitlement | null> {
  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const resolved = await resolveUserPlan(req, res).catch(() => ({ plan: 'free' as PlanId, role: null as string | null }));

  return {
    userId: user.id,
    role: (resolved.role as string | null | undefined) ?? null,
    plan: normalizePlan(resolved.plan),
  };
}

export async function requireEntitlement(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPlan: PlanId,
  opts: { allowRoles?: string[] } = {},
): Promise<{ ok: true; entitlement: UserEntitlement } | { ok: false }> {
  const entitlement = await getUserEntitlement(req, res);
  if (!entitlement) {
    res.status(401).json({ error: 'Not authenticated', requiredPlan });
    return { ok: false };
  }

  if (entitlement.role && (opts.allowRoles ?? []).includes(entitlement.role)) {
    return { ok: true, entitlement };
  }

  if (PLAN_ORDER[entitlement.plan] < PLAN_ORDER[requiredPlan]) {
    res.status(402).json({
      error: 'Upgrade required',
      requiredPlan,
      currentPlan: entitlement.plan,
      upgradeUrl: `/pricing?required=${requiredPlan}`,
    });
    return { ok: false };
  }

  return { ok: true, entitlement };
}
