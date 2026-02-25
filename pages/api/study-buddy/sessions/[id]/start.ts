// pages/api/study-buddy/sessions/[id]/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import { rateLimit } from '@/lib/rateLimit';
import {
  activeItemIndex,
  applyItemStatus,
  createSessionLogger,
  fetchSession,
  hydrateSession,
  recordEvent,
  StudyBuddyError,
  type StudyBuddySession,
} from '@/services/study-buddy/session';

const Params = z.object({ id: z.string().uuid() });

type StartResponse =
  | { ok: true; session: StudyBuddySession }
  | { ok: false; error: string; details?: unknown };

export default withPlan(
  'free',
  async (req: NextApiRequest, res: NextApiResponse<StartResponse>, ctx) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const parsed = Params.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_id', details: parsed.error.flatten() });
    }

    if (
      !(await rateLimit(req, res, { key: `study-buddy:start:${parsed.data.id}`, userId: ctx.user.id }))
    ) {
      return;
    }

    const logger = createSessionLogger('/api/study-buddy/sessions/[id]/start', ctx.user.id, parsed.data.id);
    let session: StudyBuddySession | null = null;
    try {
      session = await fetchSession(ctx.supabase, parsed.data.id, ctx.user.id);
    } catch (error) {
      if (error instanceof StudyBuddyError) {
        logger.error('load_failed', { code: error.code, meta: error.meta });
        return res.status(500).json({ ok: false, error: 'load_failed', details: error.meta });
      }
      throw error;
    }

    if (!session) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    if (session.state === 'started' || session.state === 'completed') {
      return res.status(200).json({ ok: true, session });
    }

    const now = new Date().toISOString();
    const index = Math.min(activeItemIndex(session.items), session.items.length - 1);
    if (index >= 0) {
      session = applyItemStatus(session, index, 'started');
    }

    const { data, error } = await ctx.supabase
      .from('study_buddy_sessions')
      .update({
        state: 'started',
        started_at: session.started_at ?? now,
        items: session.items,
      })
      .eq('id', session.id)
      .eq('user_id', ctx.user.id)
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('update_failed', { error: error.message });
      return res.status(500).json({ ok: false, error: 'update_failed' });
    }

    const updated = hydrateSession(data);
    if (!updated) {
      return res.status(500).json({ ok: false, error: 'hydrate_failed' });
    }

    logger.info('session_started', { itemIndex: index });
    void recordEvent('study_session_started', {
      session_id: updated.id,
      user_id: ctx.user.id,
      first_item_skill: updated.items[index]?.skill ?? null,
    });

    return res.status(200).json({ ok: true, session: updated });
  },
  { allowRoles: ['admin', 'teacher'] },
);
