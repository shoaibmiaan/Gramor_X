import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { rateLimit } from '@/lib/rateLimit';
import { getServerClient } from '@/lib/supabaseServer';
import { FeedbackJson, ScoresJson } from '@/lib/writing/schemas';

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
  const logger = createRequestLogger('api/writing/score/run', { requestId });

  if (!(await rateLimit(req, res))) {
    logger.warn('rate limit triggered on scoring', { requestId });
    return;
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid scoring payload', { issues: parsed.error.flatten(), requestId });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const { attemptId, scores, feedback } = parsed.data;

  const { data: attemptRow, error: loadError } = await supabase
    .from('writing_attempts')
    .select('status')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    logger.error('failed to load attempt for scoring', { error: loadError.message, attemptId, requestId });
    return res.status(500).json({ error: loadError.message });
  }

  if (!attemptRow) {
    logger.warn('attempt not found for scoring', { attemptId, requestId });
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (attemptRow.status === 'scored') {
    logger.info('scoring skipped because attempt already scored', { attemptId, requestId });
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
    logger.error('failed to persist scoring payload', { error: error.message, attemptId, requestId });
    return res.status(500).json({ error: error.message });
  }

  logger.info('attempt scored', { attemptId, overall: scores.overall, requestId });
  return res.status(200).json({ ok: true });
}
