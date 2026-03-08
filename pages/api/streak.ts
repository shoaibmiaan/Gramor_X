import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getUserStreak, updateStreak, getDayKeyInTZ } from '@/lib/streak';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req, res });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const streak = await getUserStreak(supabase, user.id);
      return res.status(200).json(streak);
    }

    if (req.method === 'POST') {
      const action = (req.body as { action?: string } | null)?.action;
      if (action === 'schedule' || action === 'claim' || action === 'use') {
        // Shield/recovery actions remain no-op for current streak engine but keep API compatibility.
        const streak = await getUserStreak(supabase, user.id);
        return res.status(200).json(streak);
      }

      const streak = await updateStreak(supabase, user.id);
      return res.status(200).json({
        ...streak,
        today_completed: streak.last_activity_date === getDayKeyInTZ(),
      });
    }

    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    console.error('[api/streak] error', error);
    return res.status(500).json({ error: 'internal_error' });
  }
}
