import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';

type Data = { pass: boolean; missing: string[] } | { error: string };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/readiness/evaluate', { requestId });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised readiness check', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('writing_drill_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('completed_at', since);

  if (error) {
    logger.error('failed to evaluate drill gate', { error: error.message, userId: user.id, requestId });
    return res.status(500).json({ error: error.message });
  }

  const total = count ?? 0;
  const pass = total >= 2;
  const missing = pass ? [] : ['Complete 2 targeted micro-drills in the last 7 days'];

  logger.info('readiness evaluated', { userId: user.id, drillsInWindow: total, pass, requestId });

  return res.status(200).json({ pass, missing });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
