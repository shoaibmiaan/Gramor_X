// pages/api/me/plan.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';

type Resp = { ok: true; plan: PlanId } | { ok: false; plan: PlanId };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  const supabase = supabaseServer(req);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) return res.status(200).json({ ok: false, plan: 'free' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_id')
    .eq('id', user.id)
    .maybeSingle();

  const plan = (profile?.plan_id as PlanId | undefined) ?? 'free';
  return res.status(200).json({ ok: true, plan });
}
