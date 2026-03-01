import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { withPlan as withUnifiedPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';

export type PlanGuardContext = {
  user: { id: string };
  plan: PlanId;
  role: string | null;
  supabase: ReturnType<typeof getServerClient>;
  audience: { userId: string; plan: PlanId; role: string | null };
  flags: Record<string, boolean>;
};

export type PlanGuardOptions = {
  allowRoles?: Array<'admin' | 'teacher'>;
  killSwitchFlag?: string;
};

export function withPlan(
  required: PlanId,
  handler: (req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) => unknown | Promise<unknown>,
  options: PlanGuardOptions = {},
): NextApiHandler {
  const wrapped = withUnifiedPlan(required, async (req, res) => {
    const supabase = getServerClient(req, res);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const ctx: PlanGuardContext = {
      user: { id: user.id },
      plan: 'free',
      role: null,
      supabase,
      audience: { userId: user.id, plan: 'free', role: null },
      flags: {},
    };
    return handler(req, res, ctx);
  }, { allowRoles: options.allowRoles });

  return wrapped;
}
