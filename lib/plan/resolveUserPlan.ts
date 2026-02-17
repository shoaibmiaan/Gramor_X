import { getServerClient } from '@/lib/supabaseServer';

export type PlanId = 'free' | 'starter' | 'booster' | 'master';

export async function resolveUserPlan(req: any, res: any): Promise<{ plan: PlanId; role?: string }> {
  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { plan: 'free' };

  // read from view
  const { data: v } = await supabase
    .from('v_latest_subscription_per_user')
    .select('plan_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const plan = (v?.plan_id ?? 'free') as PlanId;
  const role = profile?.role ?? undefined;
  return { plan, role };
}
