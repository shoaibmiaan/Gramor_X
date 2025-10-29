import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { rateLimit } from '@/lib/rateLimit';
import { getServerClient } from '@/lib/supabaseServer';
import { FeedbackJson, ScoresJson } from '@/lib/writing/schemas';
import { queueNotificationEvent, getNotificationContact } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';

const Body = z.object({
  attemptId: z.string().uuid(),
  scores: ScoresJson,
  feedback: FeedbackJson.optional(),
});

type Data = { ok: true } | { error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/score/run', { requestId, clientIp });

  if (!(await rateLimit(req, res))) {
    logger.warn('rate limit triggered on scoring');
    return;
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid scoring payload', { issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const { attemptId, scores, feedback } = parsed.data;

  const { data: attemptRow, error: loadError } = await supabase
    .from('writing_attempts')
    .select('status, user_id')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    logger.error('failed to load attempt for scoring', { error: loadError.message, attemptId });
    return res.status(500).json({ error: loadError.message });
  }

  if (!attemptRow) {
    logger.warn('attempt not found for scoring', { attemptId });
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (attemptRow.status === 'scored') {
    logger.info('scoring skipped because attempt already scored', { attemptId });
    return res.status(200).json({ ok: true });
  }

  const { error } = await supabase
    .from('writing_attempts')
    .update({
      status: 'scored',
      overall_band: scores.overall,
      scores_json: scores,
      feedback_json: feedback ?? null,
    })
    .eq('id', attemptId)
    .eq('status', 'submitted');

  if (error) {
    logger.error('failed to persist scoring payload', { error: error.message, attemptId });
    return res.status(500).json({ error: error.message });
  }

  logger.info('attempt scored', { attemptId, overall: scores.overall });
  await trackor.log('writing_attempt_scored', {
    attempt_id: attemptId,
    user_id: attemptRow.user_id ?? null,
    overall_band: scores.overall,
    request_id: requestId,
    ip: clientIp,
  });

  if (attemptRow.user_id) {
    const contact = await getNotificationContact(attemptRow.user_id);
    if (contact.email) {
      const baseUrl = getBaseUrl();
      const payload: Record<string, unknown> = {
        module: 'Writing',
        band: scores.overall,
        deep_link: `${baseUrl}/writing/results/${attemptId}`,
        user_email: contact.email,
      };
      if (contact.phone) {
        payload.user_phone = contact.phone;
      }

      const result = await queueNotificationEvent({
        event_key: 'score_ready',
        user_id: attemptRow.user_id,
        payload,
        channels: ['email'],
        idempotency_key: `writing_score:${attemptId}`,
      });

      if (!result.ok && result.reason !== 'duplicate') {
        logger.error('failed to enqueue score notification', {
          attemptId,
          userId: attemptRow.user_id,
          error: result.message,
        });
      }
    } else {
      logger.warn('skipping score notification because email is missing', {
        attemptId,
        userId: attemptRow.user_id,
      });
    }
  }

  return res.status(200).json({ ok: true });
}
