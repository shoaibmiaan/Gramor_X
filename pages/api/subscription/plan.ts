import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { getUserPlan } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed', plan: 'free' });

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) return res.status(200).json({ ok: false, plan: 'free' });

  const plan = await getUserPlan(userId);
  return res.status(200).json({ ok: true, plan });
}
