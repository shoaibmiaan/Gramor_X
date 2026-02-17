// pages/api/premium/eligibility.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Resp = { eligible: boolean; plan: string | null; reason?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(200).json({ eligible: false, plan: null, reason: 'unauthenticated' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(200).json({ eligible: false, plan: null, reason: 'unauthenticated' });

  const { data: prof, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (error) return res.status(200).json({ eligible: false, plan: null, reason: 'no_profile' });

  const plan = (prof?.plan ?? null) as string | null;
  const eligible = plan === 'premium' || plan === 'master';
  return res.status(200).json({ eligible, plan, reason: eligible ? undefined : 'plan_required' });
}
