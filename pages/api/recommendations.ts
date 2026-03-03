import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';
import { getNextExercises, getPersonalizedStudyPlan, getWeaknessFocusedContent } from '@/lib/recommendations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  try {
    const user = await requireAuth(supabase);
    const count = Number(req.query.count ?? 5);
    const days = Number(req.query.days ?? 7);

    const [nextExercises, weaknessFocused, studyPlan] = await Promise.all([
      getNextExercises(user.id, count, supabase as any),
      getWeaknessFocusedContent(user.id, supabase as any),
      getPersonalizedStudyPlan(user.id, days, supabase as any),
    ]);

    return res.status(200).json({ nextExercises, weaknessFocused, studyPlan, generatedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    return res.status(500).json({ error: 'recommendations_failed' });
  }
}
