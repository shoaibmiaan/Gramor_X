// pages/api/study-buddy/sessions/[id]/complete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import { rateLimit } from '@/lib/rateLimit';
import {
  computeDuration,
  createSessionLogger,
  fetchSession,
  hydrateSession,
  recordEvent,
  awardStudyBuddyXp,
  StudyBuddyError,
  PlanLimitError,
  type StudyBuddySession,
} from '@/services/study-buddy/session';

const Params = z.object({ id: z.string().uuid() });

type CompleteResponse =
  | { ok: true; session: StudyBuddySession; xp: number; capped: boolean }
  | { ok: false; error: string; details?: unknown };

export default withPlan(
  'free',
  async (req: NextApiRequest, res: NextApiResponse<CompleteResponse>, ctx) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const parsed = Params.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_id', details: parsed.error.flatten() });
    }

    if (
      !(await rateLimit(req, res, { key: `study-buddy:complete:${parsed.data.id}`, userId: ctx.user.id }))
    ) {
      return;
    }

    const logger = createSessionLogger('/api/study-buddy/sessions/[id]/complete', ctx.user.id, parsed.data.id);
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

    if (session.state === 'completed') {
      return res.status(200).json({ ok: true, session, xp: session.xp_earned ?? 0, capped: false });
    }

    const completedMinutes = computeDuration(session.items, true);
    const effectiveMinutes = completedMinutes > 0 ? completedMinutes : computeDuration(session.items);
    const now = new Date().toISOString();

    let xpAward = { requested: 0, awarded: 0, capped: false, remainingAllowance: 0, dayIso: '' };
    try {
      xpAward = await awardStudyBuddyXp(ctx.supabase, session, ctx.plan);
    } catch (error) {
      if (error instanceof PlanLimitError && error.code === 'xp_cap_reached') {
        logger.warn('xp_cap_reached', error.meta);
        xpAward = {
          requested: computeDuration(session.items, true) * 4,
          awarded: 0,
          capped: true,
          remainingAllowance: error.remaining,
          dayIso: '',
        };
      } else if (error instanceof StudyBuddyError) {
        logger.error('xp_award_failed', { code: error.code, meta: error.meta });
        return res.status(500).json({ ok: false, error: 'xp_award_failed', details: error.meta });
      } else {
        throw error;
      }
    }

    const updates = {
      state: 'completed' as const,
      ended_at: now,
      started_at: session.started_at ?? now,
      duration_minutes: effectiveMinutes,
      xp_earned: xpAward.awarded,
      items: session.items.map((item) => ({ ...item, status: item.status === 'completed' ? 'completed' : item.status })),
    };

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

    logger.info('session_completed', { minutes: effectiveMinutes, xp: xpAward.awarded });
    void recordEvent('study_session_completed', {
      session_id: updated.id,
      user_id: ctx.user.id,
      completed_minutes: completedMinutes,
      planned_minutes: computeDuration(updated.items),
      xp_awarded: xpAward.awarded,
      xp_requested: xpAward.requested,
      capped: xpAward.capped,
    });
    if (completedMinutes === 0) {
      void recordEvent('study_session_abandoned', {
        session_id: updated.id,
        user_id: ctx.user.id,
        reason: 'no_items_completed',
      });
    }

    return res.status(200).json({ ok: true, session: updated, xp: xpAward.awarded, capped: xpAward.capped });
  },
  { allowRoles: ['admin', 'teacher'] },
);
