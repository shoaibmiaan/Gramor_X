import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';

type Data = Record<string, unknown> | { error: string };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/attempts/get', { requestId });
  const startedAt = Date.now();

  const { id } = req.query;
  if (typeof id !== 'string') {
    logger.warn('invalid attempt id query', { requestId, id });
    return res.status(400).json({ error: 'Invalid attempt id' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised attempt fetch', { attemptId: id, requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data, error } = await supabase
    .from('writing_attempts')
    .select('*, writing_metrics(*), writing_reviews(*), writing_originals(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('failed to load attempt', { attemptId: id, error: error.message, userId: user.id, requestId });
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    logger.warn('attempt not found', { attemptId: id, userId: user.id, requestId });
    return res.status(404).json({ error: 'Not found' });
  }

  logger.info('attempt fetched', { attemptId: id, userId: user.id, latencyMs: Date.now() - startedAt });
  return res.status(200).json(data as Record<string, unknown>);
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
