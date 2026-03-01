import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { withPlan as withUnifiedPlan } from '@/lib/apiGuard';
import type { PlanId } from '@/types/pricing';
import { getServerClient } from '@/lib/supabaseServer';

export type PlanGuardContext = {
  supabase: ReturnType<typeof getServerClient>;
  user: { id: string; email?: string | null };
  plan: PlanId;
};

type Handler2 = (req: NextApiRequest, res: NextApiResponse) => any;
type Handler3 = (req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) => any;

type Options = {
  allowRoles?: string[];
};

export function withPlan(requiredPlan: PlanId, handler: Handler2 | Handler3, opts: Options = {}): NextApiHandler {
  return withUnifiedPlan(requiredPlan, async (req, res) => {
    const supabase = getServerClient(req, res);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const ctx: PlanGuardContext = {
      supabase,
      user: { id: data.user.id, email: data.user.email ?? null },
      plan: 'free',
    };

    return (handler as any)(req, res, ctx);
  }, { allowRoles: (opts.allowRoles ?? []) as Array<'admin' | 'teacher'> });
}

export default withPlan;
