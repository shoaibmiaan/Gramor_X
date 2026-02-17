// lib/plan/withPlan.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';
import { evaluateQuota, upgradeAdvice, type QuotaKey } from '@/lib/plan/quotas';
import { resolveUserPlan } from '@/lib/plan/resolveUserPlan';

// --- Plan helpers ------------------------------------------------------------

const PLAN_RANK: Record<PlanId, number> = { free: 0, starter: 1, booster: 2, master: 3 };

function normalizePlan(input: unknown): PlanId {
  const raw =
    (typeof input === 'string' && input) ||
    (input && typeof input === 'object' && ((input as any).plan_id || (input as any).plan || (input as any).id)) ||
    null;

  const v = typeof raw === 'string' ? raw.toLowerCase().trim() : 'free';

  if (v === 'free' || v === 'starter' || v === 'booster' || v === 'master') return v as PlanId;
  if (v === 'seedling') return 'free';   // legacy aliases
  if (v === 'rocket')   return 'starter';
  if (v === 'owl')      return 'booster';
  return 'free';
}

function rank(plan: unknown): number {
  return PLAN_RANK[normalizePlan(plan)];
}

function hasRequiredPlan(userPlan: unknown, required: PlanId) {
  return rank(userPlan) >= PLAN_RANK[required];
}

// --- Types -------------------------------------------------------------------

export type PlanGuardContext = {
  supabase: ReturnType<typeof getServerClient>;
  user: { id: string; email?: string | null };
  plan: PlanId;
};

type Handler2 = (req: NextApiRequest, res: NextApiResponse) => any;
type Handler3 = (req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) => any;

type Options = {
  allowRoles?: string[];     // e.g., ['admin', 'teacher'] bypass
  killSwitchFlag?: string;   // reserved; no-op here
  quota?: {
    key: QuotaKey;
    amount?: number; // default 1
    getUsedToday?: (ctx: PlanGuardContext) => Promise<number>;
  };
};

// --- Impl --------------------------------------------------------------------

export function withPlan(requiredPlan: PlanId, handler: Handler2 | Handler3, opts: Options = {}): NextApiHandler {
  const allowRoles = (opts.allowRoles ?? []).map((r) => r.toLowerCase());

  return async function planWrapped(req: NextApiRequest, res: NextApiResponse) {
    const supabase = getServerClient(req, res);

    // auth
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    const user = auth?.user;
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    // role bypass (profiles.role or user_roles.role — try both safely)
    let role: string | undefined;
    try {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      role = (prof?.role as string | undefined)?.toLowerCase();
    } catch { /* ignore */ }
    if (!role) {
      try {
        const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
        role = (roleRow?.role as string | undefined)?.toLowerCase();
      } catch { /* ignore */ }
    }
    if (role && allowRoles.includes(role)) {
      // still provide ctx for handlers that accept it
      const ctx: PlanGuardContext = {
        supabase,
        user: { id: user.id, email: user.email ?? null },
        plan: normalizePlan(await safeResolvePlan(supabase, user.id)),
      };
      return (handler as any)(req, res, ctx);
    }

    // plan resolution + enforcement
    const userPlan = normalizePlan(await safeResolvePlan(supabase, user.id));
    if (!hasRequiredPlan(userPlan, requiredPlan)) {
      return res.status(403).json({ error: 'Plan required', need: requiredPlan, have: userPlan });
    }

    const ctx: PlanGuardContext = {
      supabase,
      user: { id: user.id, email: user.email ?? null },
      plan: userPlan,
    };

    // optional quota guard
    if (opts.quota) {
      const { key, amount = 1, getUsedToday } = opts.quota;
      let used = 0;
      try {
        used = getUsedToday ? await getUsedToday(ctx) : 0;
      } catch { used = 0; }

      const snap = evaluateQuota(ctx.plan, key, used);
      if (!snap.isUnlimited && snap.remaining < amount) {
        const advice = upgradeAdvice(ctx.plan, key, used);
        return res.status(402).json({
          error: 'Quota exceeded',
          quota: { key, limit: snap.limit, used: snap.used, remaining: snap.remaining },
          advice,
        });
      }
    }

    // always call handler with ctx; handlers that only accept (req,res) will ignore it at runtime
    return (handler as any)(req, res, ctx);
  };
}

// Try resolveUserPlan first; fall back to user_profiles.plan_id
async function safeResolvePlan(supabase: ReturnType<typeof getServerClient>, userId: string): Promise<PlanId> {
  try {
    const p = await resolveUserPlan(supabase, userId);
    return normalizePlan(p);
  } catch {
    try {
      const { data } = await supabase.from('user_profiles').select('plan_id').eq('user_id', userId).maybeSingle();
      return normalizePlan(data?.plan_id ?? 'free');
    } catch {
      return 'free';
    }
  }
}

export default withPlan;
