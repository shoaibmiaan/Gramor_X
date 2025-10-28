import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import calibration from '@/data/writing/review-calibration';
import { z } from 'zod';

const SubmitBody = z.object({
  anchorId: z.string(),
  ratings: z.object({
    TR: z.number().min(0).max(9),
    CC: z.number().min(0).max(9),
    LR: z.number().min(0).max(9),
    GRA: z.number().min(0).max(9),
  }),
  notes: z.string().max(500).optional(),
});

type Data =
  | { anchors: typeof calibration }
  | { ok: true }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/reviews/calibrate', { requestId });
  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    logger.info('served calibration anchors', { userId: user.id, requestId });
    return res.status(200).json({ anchors: calibration });
  }

  if (req.method === 'POST') {
    const parsed = SubmitBody.safeParse(req.body);
    if (!parsed.success) {
      logger.warn('invalid calibration submission', { requestId, issues: parsed.error.flatten() });
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    await supabase
      .from('writing_drill_events')
      .insert({
        user_id: user.id,
        attempt_id: null,
        tags: ['CALIBRATION_PASSED'],
      });

    logger.info('calibration recorded', { userId: user.id, anchorId: parsed.data.anchorId, requestId });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
