import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { recommendDrills } from '@/lib/writing/drills';
import { z } from 'zod';

const Body = z.object({
  weakCriteria: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(8).optional(),
});

type Data =
  | {
      drills: ReturnType<typeof recommendDrills>;
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/drills/recommend', { requestId });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid drill recommend payload', { requestId, issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('unauthorised drill recommendation', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const drills = recommendDrills(parsed.data);
  logger.info('drill recommendations generated', {
    userId: user.id,
    requestId,
    weakCriteria: parsed.data.weakCriteria ?? [],
    tags: parsed.data.tags ?? [],
    count: drills.length,
  });

  return res.status(200).json({ drills });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
