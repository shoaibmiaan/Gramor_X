// pages/api/study-buddy/sessions/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import { hydrateSession, createSessionLogger, type StudyBuddySession } from '@/services/study-buddy/session';

const Params = z.object({
  id: z.string().uuid(),
});

type GetSessionResponse =
  | { ok: true; session: StudyBuddySession }
  | { ok: false; error: string; details?: unknown };

export default withPlan(
  'free',
  async (req: NextApiRequest, res: NextApiResponse<GetSessionResponse>, ctx) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const parsed = Params.safeParse({ id: req.query.id });
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_id', details: parsed.error.flatten() });
    }

    const logger = createSessionLogger('/api/study-buddy/sessions/[id]', ctx.user.id, parsed.data.id);
    const { data, error } = await ctx.supabase
      .from('study_buddy_sessions')
      .select('*')
      .eq('id', parsed.data.id)
      .eq('user_id', ctx.user.id)
      .maybeSingle();

    if (error) {
      logger.error('load_failed', { error: error.message });
      return res.status(500).json({ ok: false, error: 'load_failed' });
    }

    const session = hydrateSession(data);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    return res.status(200).json({ ok: true, session });
  },
  { allowRoles: ['admin', 'teacher'] },
);
