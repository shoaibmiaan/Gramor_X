import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';
import { predictBandScore } from '@/lib/prediction';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  try {
    const user = await requireAuth(supabase);
    const prediction = await predictBandScore(user.id, supabase as any);
    return res.status(200).json(prediction);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    return res.status(500).json({ error: 'prediction_failed' });
  }
}
