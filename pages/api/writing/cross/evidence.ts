import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { fetchReadingEvidence } from '@/lib/writing/crossModule';
import { CrossEvidenceBody } from '@/lib/writing/schemas';

type Data =
  | {
      evidence: ReturnType<typeof fetchReadingEvidence> extends Promise<infer R> ? R : never;
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/cross/evidence', { requestId, clientIp });

  const parsed = CrossEvidenceBody.safeParse(req.body);
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
    logger.warn('unauthorised evidence request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { promptId, topic } = parsed.data;

  let promptTopic = topic;
  if (!promptTopic) {
    const { data: promptRow } = await supabase
      .from('writing_prompts')
      .select('topic')
      .eq('id', promptId)
      .maybeSingle();
    promptTopic = promptRow?.topic ?? '';
  }

  try {
    const evidence = await fetchReadingEvidence(supabase, user.id, promptTopic ?? '');
    logger.info('cross-module evidence surfaced', { userId: user.id, promptId, count: evidence.length });
    await trackor.log('writing_cross_evidence', {
      user_id: user.id,
      prompt_id: promptId,
      evidence_count: evidence.length,
      request_id: requestId,
      ip: clientIp,
    });
    return res.status(200).json({ evidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load evidence suggestions';
    logger.error('failed to load evidence', { error: message, userId: user.id, promptId });
    return res.status(500).json({ error: message });
  }
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
