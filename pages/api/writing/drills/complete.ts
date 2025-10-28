import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { evaluateReadiness } from '@/lib/writing/readiness';
import { DrillCompleteBody } from '@/lib/writing/schemas';

type Data = { ok: true } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/drills/complete', { requestId, clientIp });
  const startedAt = Date.now();

  const parsed = DrillCompleteBody.safeParse(req.body);
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
    logger.warn('unauthorised drill completion');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { attemptId, tags } = parsed.data;

  if (attemptId) {
    const { data: attemptRow, error: attemptError } = await supabase
      .from('writing_attempts')
      .select('user_id')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError) {
      logger.error('failed to validate attempt for drill', { error: attemptError.message, attemptId, userId: user.id });
      return res.status(500).json({ error: attemptError.message });
    }

    if (!attemptRow || attemptRow.user_id !== user.id) {
      logger.warn('drill completion forbidden for attempt', { attemptId, userId: user.id });
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const { error } = await supabase
    .from('writing_drill_events')
    .insert({
      user_id: user.id,
      attempt_id: attemptId ?? null,
      tags,
    });

  if (error) {
    logger.error('failed to record drill completion', { error: error.message, attemptId, userId: user.id });
    return res.status(500).json({ error: error.message });
  }

  const gate = await evaluateReadiness(supabase, user.id);

  const latency = Date.now() - startedAt;
  logger.info('drill completion recorded', {
    userId: user.id,
    attemptId: attemptId ?? null,
    tags,
    readinessPass: gate.pass,
    latencyMs: latency,
  });

  await trackor.log('writing_drill_completed', {
    user_id: user.id,
    attempt_id: attemptId ?? null,
    tags,
    readiness_pass: gate.pass ? 1 : 0,
    latency_ms: latency,
    request_id: requestId,
    ip: clientIp,
  });

  return res.status(200).json({ ok: true });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
