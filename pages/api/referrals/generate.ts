import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/plan/withPlan';

const Body = z.object({}).optional();

type Resp =
  | { code: string; stats: { credits: number; lifetime_earned: number; total_referrals: number } }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: code, error } = await supabase.rpc<string>('referrals_generate_code');
  if (error || !code) return res.status(500).json({ error: 'Could not allocate referral code', details: error });

  const { data: stats } = await supabase
    .from('referral_balances')
    .select('credits,lifetime_earned,total_referrals')
    .eq('user_id', user.id)
    .single();

  return res.status(200).json({
    code,
    stats: {
      credits: stats?.credits ?? 0,
      lifetime_earned: stats?.lifetime_earned ?? 0,
      total_referrals: stats?.total_referrals ?? 0,
    },
  });
}

export default withPlan('free', handler, { allowRoles: ['admin', 'teacher'] });
