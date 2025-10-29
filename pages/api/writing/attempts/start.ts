import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { AttemptStartBody } from '@/lib/writing/schemas';

type Data = { attemptId: string } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/attempts/start', { requestId, clientIp });
  const startedAt = Date.now();

  const parsed = AttemptStartBody.safeParse(req.body);
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
    logger.warn('unauthorised start attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { promptId, taskType } = parsed.data;
  logger.info('creating writing attempt', { promptId, taskType, userId: user.id });

  const { data, error } = await supabase
    .from('writing_attempts')
    .insert({ user_id: user.id, prompt_id: promptId, task_type: taskType })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('failed to create attempt', { error: error?.message, userId: user.id, promptId });
    return res.status(500).json({ error: error?.message ?? 'Failed to create attempt' });
  }

  const latency = Date.now() - startedAt;
  logger.info('attempt created', { attemptId: data.id, latencyMs: latency, userId: user.id });
  await trackor.log('writing_attempt_started', {
    attempt_id: data.id,
    user_id: user.id,
    prompt_id: promptId,
    task_type: taskType,
    latency_ms: latency,
    request_id: requestId,
    ip: clientIp,
  });

  return res.status(200).json({ attemptId: data.id });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
