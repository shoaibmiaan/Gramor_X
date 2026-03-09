import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { getActiveSubscription, isSubscriptionActive } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) return res.status(200).json({ ok: false, active: false, subscription: null });

  const subscription = await getActiveSubscription(userId);
  const active = await isSubscriptionActive(userId);
  return res.status(200).json({ ok: true, active, subscription });
}
