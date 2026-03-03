import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';
import { getUsagePercentage } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const rawFeature = req.query.feature;
  const feature = Array.isArray(rawFeature) ? rawFeature[0] : rawFeature;
  if (!feature) return res.status(400).json({ error: 'feature_required' });

  const supabase = createSupabaseServerClient({ req, res });

  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }

  const result = await getUsagePercentage(supabase, user.id, feature);
  return res.status(200).json({ ok: true, ...result });
}
