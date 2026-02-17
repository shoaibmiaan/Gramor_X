import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { buildHedgingSuggestions } from '@/lib/writing/crossModule';

const DEFAULT_LIMIT = 6;

type Data =
  | {
      suggestions: ReturnType<typeof buildHedgingSuggestions>;
    }
  | { error: string };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/cross/hedging', { requestId, clientIp });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised hedging request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limitParam = Number.parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 10) : DEFAULT_LIMIT;

  try {
    const { data: attempts } = await supabase
      .from('speaking_attempts')
      .select('transcript')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    const transcripts = (attempts ?? []).map((row) => row.transcript ?? '');
    const suggestions = buildHedgingSuggestions(transcripts);
    logger.info('hedging suggestions computed', { userId: user.id, suggestions: suggestions.length });
    await trackor.log('writing_cross_hedging', {
      user_id: user.id,
      suggestion_count: suggestions.length,
      request_id: requestId,
      ip: clientIp,
    });
    return res.status(200).json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compute hedging suggestions';
    logger.error('failed to compute hedging suggestions', { error: message, userId: user.id });
    return res.status(500).json({ error: message });
  }
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
