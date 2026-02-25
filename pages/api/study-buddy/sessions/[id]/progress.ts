// pages/api/study-buddy/sessions/[id]/progress.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import { rateLimit } from '@/lib/rateLimit';
import {
  activeItemIndex,
  applyItemStatus,
  assertTransition,
  createSessionLogger,
  computeDuration,
  fetchSession,
  hydrateSession,
  recordEvent,
  StudyBuddyError,
  type StudyBuddySession,
} from '@/services/study-buddy/session';

const Params = z.object({ id: z.string().uuid() });

const Body = z.object({
  itemIndex: z.number().int().min(0),
  status: z.enum(['pending', 'started', 'completed']),
  note: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .optional()
    .nullable(),
});

type ProgressResponse =
  | { ok: true; session: StudyBuddySession }
  | { ok: false; error: string; details?: unknown };

export default withPlan(
  'free',
  async (req: NextApiRequest, res: NextApiResponse<ProgressResponse>, ctx) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const parsedParams = Params.safeParse(req.query);
    if (!parsedParams.success) {
      return res.status(400).json({ ok: false, error: 'invalid_id', details: parsedParams.error.flatten() });
    }

    const { id } = parsedParams.data;

    if (!(await rateLimit(req, res, { key: `study-buddy:progress:${id}`, userId: ctx.user.id }))) {
      return;
    }

    const parsedBody = Body.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res.status(400).json({ ok: false, error: 'invalid_payload', details: parsedBody.error.flatten() });
    }

    const { itemIndex, status, note } = parsedBody.data;
    const logger = createSessionLogger('/api/study-buddy/sessions/[id]/progress', ctx.user.id, id);

    let session: StudyBuddySession | null = null;
    try {
      session = await fetchSession(ctx.supabase, id, ctx.user.id);
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

    try {
      assertTransition(session, itemIndex, status);
    } catch (error) {
      if (error instanceof StudyBuddyError) {
        return res.status(409).json({ ok: false, error: error.code, details: error.meta });
      }
      throw error;
    }

    session = applyItemStatus(session, itemIndex, status, note);

    const updates: Record<string, unknown> = {
      items: session.items,
    };

    if (!session.started_at) {
      updates.started_at = new Date().toISOString();
    }

    if (status === 'started' && session.state === 'pending') {
      session = { ...session, state: 'started', started_at: (updates.started_at as string) ?? new Date().toISOString() };
      updates.state = 'started';
    }

    if (status === 'pending') {
      const nextIndex = activeItemIndex(session.items);
      if (nextIndex === session.items.length) {
        updates.state = 'completed';
      }
    }

    if (status === 'completed') {
      const nextIndex = activeItemIndex(session.items);
      if (nextIndex >= session.items.length) {
        updates.state = 'completed';
        updates.ended_at = new Date().toISOString();
        updates.duration_minutes = computeDuration(session.items, true);
      } else {
        updates.state = 'started';
      }

      void recordEvent('study_item_completed', {
        session_id: session.id,
        user_id: ctx.user.id,
        item_index: itemIndex,
        skill: session.items[itemIndex]?.skill ?? 'General',
        minutes: session.items[itemIndex]?.minutes ?? 0,
      });
    }

    const { data, error } = await ctx.supabase
      .from('study_buddy_sessions')
      .update(updates)
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

    logger.info('progress_saved', { itemIndex, status });
    return res.status(200).json({ ok: true, session: updated });
  },
  { allowRoles: ['admin', 'teacher'] },
);
