import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';
import {
  getEstimatedBandScore,
  getImprovementGraph,
  getSkillHeatmap,
  getStrengthsWeaknesses,
  getStudyStreak,
} from '@/lib/dashboard';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }

  const [estimatedBand, heatmap, strengthWeakness, studyStreak, improvement] = await Promise.all([
    getEstimatedBandScore(supabase, user.id),
    getSkillHeatmap(supabase, user.id),
    getStrengthsWeaknesses(supabase, user.id),
    getStudyStreak(supabase, user.id),
    getImprovementGraph(supabase, user.id, 30),
  ]);

  return res.status(200).json({
    estimatedBand,
    heatmap,
    strengths: strengthWeakness.strengths,
    weaknesses: strengthWeakness.weaknesses,
    studyStreak,
    improvement,
  });
}
