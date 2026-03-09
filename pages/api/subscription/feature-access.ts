import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { getFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed', access: false });

  const feature = typeof req.query.feature === 'string' ? req.query.feature : '';
  if (!feature) return res.status(400).json({ ok: false, error: 'feature_required', access: false });

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) return res.status(200).json({ ok: false, access: false });

  const access = await getFeatureAccess(userId, feature);
  return res.status(200).json({ ok: true, access, feature });
}
