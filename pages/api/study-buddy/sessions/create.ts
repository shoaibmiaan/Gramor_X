// pages/api/study-buddy/sessions/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import { rateLimit } from '@/lib/rateLimit';
import {
  createSessionLogger,
  enforceDailyMinutesLimit,
  hydrateSession,
  recordEvent,
  sanitiseItems,
  StudyBuddyError,
  type StudyBuddySession,
} from '@/services/study-buddy/session';

const ItemSchema = z.object({
  skill: z.string().trim().min(2).max(80),
  minutes: z.coerce.number().int().min(5).max(90),
  topic: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .optional()
    .nullable(),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1).max(6),
  aiPlanId: z.string().uuid().optional().nullable(),
});

type CreateSessionResponse =
  | { ok: true; session: StudyBuddySession }
  | { ok: false; error: string; details?: unknown; remainingMinutes?: number };

export default withPlan(
  'free',
  async (req: NextApiRequest, res: NextApiResponse<CreateSessionResponse>, ctx) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    if (!(await rateLimit(req, res, { key: 'study-buddy:create', userId: ctx.user.id }))) return;

    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_payload', details: parsed.error.flatten() });
    }

    const items = sanitiseItems(parsed.data.items).map((item) => ({ ...item, status: 'pending' as const }));
    const plannedMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
    const logger = createSessionLogger('/api/study-buddy/sessions/create', ctx.user.id);

    try {
      await enforceDailyMinutesLimit(ctx.supabase, ctx.user.id, ctx.plan, plannedMinutes);
    } catch (error) {
      if (error instanceof StudyBuddyError && error.code === 'daily_minutes_exceeded') {
        logger.info('daily minutes limit hit', error.meta);
        return res.status(402).json({
          ok: false,
          error: 'daily_minutes_limit',
          details: error.meta,
          remainingMinutes: (error.meta?.remaining as number | undefined) ?? 0,
        });
      }
      if (error instanceof StudyBuddyError) {
        logger.error('preflight failed', { code: error.code, meta: error.meta });
      }
      return res.status(500).json({ ok: false, error: 'preflight_failed' });
    }

    const payload = {
      user_id: ctx.user.id,
      items,
      state: 'pending' as const,
      duration_minutes: plannedMinutes,
      ai_plan_id: parsed.data.aiPlanId ?? null,
      xp_earned: 0,
    };

    const { data, error } = await ctx.supabase
      .from('study_buddy_sessions')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logger.error('insert_failed', { error: error.message });
      return res.status(500).json({ ok: false, error: 'insert_failed' });
    }

    const session = hydrateSession(data);
    if (!session) {
      return res.status(500).json({ ok: false, error: 'hydrate_failed' });
    }

    logger.info('session_created', { sessionId: session.id, plannedMinutes });
    void recordEvent('study_session_created', {
      session_id: session.id,
      user_id: ctx.user.id,
      planned_minutes: plannedMinutes,
      item_count: session.items.length,
      plan: ctx.plan,
    });

    return res.status(200).json({ ok: true, session });
  },
  { allowRoles: ['admin', 'teacher'] },
);
