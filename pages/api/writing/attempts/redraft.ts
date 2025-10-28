import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { RedraftBody } from '@/lib/writing/schemas';

type Data = { attemptId: string } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/attempts/redraft', { requestId });
  const startedAt = Date.now();

  const parsed = RedraftBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid payload', { issues: parsed.error.flatten(), requestId });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised redraft attempt', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sourceAttemptId } = parsed.data;

  const { data: sourceAttempt, error: sourceError } = await supabase
    .from('writing_attempts')
    .select('prompt_id, task_type, status')
    .eq('id', sourceAttemptId)
    .eq('user_id', user.id)
    .single();

  if (sourceError || !sourceAttempt) {
    logger.warn('source attempt not found for redraft', { attemptId: sourceAttemptId, userId: user.id, requestId });
    return res.status(404).json({ error: sourceError?.message ?? 'Attempt not found' });
  }

  if (sourceAttempt.status !== 'scored') {
    logger.info('redraft blocked because attempt not scored', { attemptId: sourceAttemptId, status: sourceAttempt.status, userId: user.id });
    return res.status(409).json({ error: 'Attempt must be scored before redrafting' });
  }

  const { data: readinessRow } = await supabase
    .from('writing_readiness')
    .select('status, gates_json')
    .eq('user_id', user.id)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readinessRow && readinessRow.status !== 'pass') {
    const missing = Array.isArray((readinessRow.gates_json as { missing?: unknown })?.missing)
      ? ((readinessRow.gates_json as { missing?: string[] }).missing ?? [])
      : [];
    logger.info('redraft blocked by readiness gate', { userId: user.id, attemptId: sourceAttemptId, requestId, missing });
    return res.status(403).json({ error: 'Readiness gate not met', details: { missing } });
  }

  const { data, error } = await supabase
    .from('writing_attempts')
    .insert({
      user_id: user.id,
      prompt_id: sourceAttempt.prompt_id,
      task_type: sourceAttempt.task_type,
      version_of: sourceAttemptId,
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('failed to create redraft attempt', { error: error?.message, sourceAttemptId, userId: user.id, requestId });
    return res.status(500).json({ error: error?.message ?? 'Failed to create redraft' });
  }

  logger.info('redraft created', { sourceAttemptId, newAttemptId: data.id, userId: user.id, latencyMs: Date.now() - startedAt });
  return res.status(200).json({ attemptId: data.id });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
