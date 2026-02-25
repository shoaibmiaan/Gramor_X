import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/plan/withPlan';

const Body = z.object({
  refereeId: z.string().uuid(),
  reason: z.enum(['first_mock', 'first_purchase']),
});

type Resp = { awarded: number } | { error: string; details?: unknown };

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

  // Safety: only allow self-qualification from the user's own server-triggered flow
  if (user.id !== parse.data.refereeId) return res.status(403).json({ error: 'Forbidden' });

  const { data: awarded, error } = await supabase.rpc<number>('referrals_qualify', {
    p_referee_id: parse.data.refereeId,
    p_reason: parse.data.reason,
  });

  if (error) return res.status(400).json({ error: error.message, details: error });
  return res.status(200).json({ awarded: awarded ?? 0 });
}

export default withPlan('free', handler, { allowRoles: ['admin', 'teacher'] });
