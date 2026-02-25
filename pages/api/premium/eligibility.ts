// pages/api/premium/eligibility.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use service role client for token verification (no refresh needed)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Resp = { eligible: boolean; plan: string | null; reason?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ eligible: false, plan: null, reason: 'server_config_error' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(200).json({ eligible: false, plan: null, reason: 'unauthenticated' });
  }

  // Verify token using service role
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(200).json({ eligible: false, plan: null, reason: 'unauthenticated' });
  }

  // Fetch user's plan
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(200).json({ eligible: false, plan: null, reason: 'no_profile' });
  }

  const plan = profile.plan as string | null;
  const eligible = plan === 'premium' || plan === 'master';

  return res.status(200).json({ eligible, plan, reason: eligible ? undefined : 'plan_required' });
}