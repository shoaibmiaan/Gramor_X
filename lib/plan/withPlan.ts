import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { withPlan as withUnifiedPlan } from '@/lib/apiGuard';
import type { PlanId } from '@/types/pricing';
import { getServerClient } from '@/lib/supabaseServer';
import { resolveUserPlan } from '@/lib/plan/resolveUserPlan';

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  booster: 2,
  master: 3,
};

export type PlanGuardContext = {
  supabase: ReturnType<typeof getServerClient>;
  user: { id: string; email?: string | null };
  plan: PlanId;
};

type ApiHandler2 = (req: NextApiRequest, res: NextApiResponse) => unknown | Promise<unknown>;
type ApiHandler3 = (req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) => unknown | Promise<unknown>;

type Options = {
  allowRoles?: Array<'admin' | 'teacher'>;
};

type GuardedGetServerSideProps<P> = (
  handler: (ctx: GetServerSidePropsContext, guard: PlanGuardContext) => Promise<GetServerSidePropsResult<P>>
) => GetServerSideProps<P>;

function normalizePlan(plan: unknown): PlanId {
  const value = String(plan ?? 'free').toLowerCase();
  if (value === 'starter' || value === 'booster' || value === 'master') return value;
  return 'free';
}

function hasRequiredPlan(userPlan: PlanId, requiredPlan: PlanId) {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

function buildUpgradeRedirect(ctx: GetServerSidePropsContext, requiredPlan: PlanId): GetServerSidePropsResult<never> {
  const currentPath = ctx.resolvedUrl || '/';
  const destination = `/pricing?required=${requiredPlan}&from=${encodeURIComponent(currentPath)}`;
  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
}

async function resolveGuardContext(req: NextApiRequest, res: NextApiResponse): Promise<PlanGuardContext | null> {
  const supabase = getServerClient(req, res);
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const resolved = await resolveUserPlan(req, res).catch(() => ({ plan: 'free' as PlanId }));
  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    plan: normalizePlan(resolved.plan),
  };
}

export function withPlan<P = Record<string, never>>(requiredPlan: PlanId): GuardedGetServerSideProps<P>;
export function withPlan(requiredPlan: PlanId, handler: ApiHandler2 | ApiHandler3, opts?: Options): NextApiHandler;
export function withPlan<P = Record<string, never>>(
  requiredPlan: PlanId,
  handler?: ApiHandler2 | ApiHandler3,
  opts: Options = {},
) {
  if (handler) {
    return withUnifiedPlan(
      requiredPlan,
      async (req, res) => {
        const guard = await resolveGuardContext(req, res);
        if (!guard) return;
        return (handler as ApiHandler3)(req, res, guard);
      },
      { allowRoles: opts.allowRoles ?? [] },
    );
  }

  return function guardServerSideProps(
    pageHandler: (ctx: GetServerSidePropsContext, guard: PlanGuardContext) => Promise<GetServerSidePropsResult<P>>,
  ): GetServerSideProps<P> {
    return async function guarded(ctx) {
      const supabase = getServerClient(ctx.req as NextApiRequest, ctx.res as NextApiResponse);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return pageHandler(ctx, {
          supabase,
          user: { id: '', email: null },
          plan: 'free',
        });
      }

      const resolved = await resolveUserPlan(ctx.req, ctx.res).catch(() => ({ plan: 'free' as PlanId, role: null as string | null }));
      const normalizedPlan = normalizePlan(resolved.plan);
      const role = String(resolved.role ?? '').toLowerCase();

      const isRoleBypass = role !== '' && (opts.allowRoles ?? []).includes(role as 'admin' | 'teacher');

      if (!isRoleBypass && !hasRequiredPlan(normalizedPlan, requiredPlan)) {
        return buildUpgradeRedirect(ctx, requiredPlan) as GetServerSidePropsResult<P>;
      }

      return pageHandler(ctx, {
        supabase,
        user: { id: user.id, email: user.email ?? null },
        plan: normalizedPlan,
      });
    };
  };
}

export default withPlan;
