import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { rateLimit } from '@/lib/rateLimit';
import { getServerClient } from '@/lib/supabaseServer';
import { SubmitBody } from '@/lib/writing/schemas';

interface AcceptedResponse {
  accepted: true;
  attemptId: string;
}

type Data = AcceptedResponse | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/attempts/submit', { requestId, clientIp });
  const startedAt = Date.now();

  if (!(await rateLimit(req, res))) {
    logger.warn('rate limit exceeded on submit');
    return;
  }

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid payload', { issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised submit attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { attemptId } = parsed.data;

  const { data: attemptRow, error: loadError } = await supabase
    .from('writing_attempts')
    .select('user_id, status')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    logger.error('failed to load attempt before submit', { error: loadError.message, attemptId, userId: user.id });
    return res.status(500).json({ error: loadError.message });
  }

  if (!attemptRow) {
    logger.warn('attempt not found for submit', { attemptId, userId: user.id });
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (attemptRow.user_id !== user.id) {
    logger.warn('submit forbidden', { attemptId, userId: user.id });
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (attemptRow.status !== 'draft') {
    logger.info('submit ignored because attempt already submitted', { attemptId, status: attemptRow.status, userId: user.id });
    return res.status(409).json({ error: 'Attempt already submitted' });
  }

  const { error } = await supabase
    .from('writing_attempts')
    .update({ status: 'submitted' })
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .eq('status', 'draft');

  if (error) {
    logger.error('failed to submit attempt', { error: error.message, attemptId, userId: user.id });
    return res.status(500).json({ error: error.message });
  }

  const latency = Date.now() - startedAt;
  logger.info('attempt submitted', { attemptId, userId: user.id, latencyMs: latency });
  await trackor.log('writing_attempt_submitted', {
    attempt_id: attemptId,
    user_id: user.id,
    latency_ms: latency,
    request_id: requestId,
    ip: clientIp,
  });

  // TODO: enqueue scoring job via background worker
  return res.status(202).json({ accepted: true, attemptId });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
