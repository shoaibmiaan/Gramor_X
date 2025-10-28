import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { evaluateReadiness } from '@/lib/writing/readiness';

type Data =
  | {
      pass: boolean;
      missing: string[];
      summary: {
        recentBand?: number | null;
        previousBand?: number | null;
        bandDelta?: number | null;
        recentWpm?: number | null;
        requiredDrills: Record<string, number>;
        completedDrills: Record<string, number>;
      };
    }
  | { error: string };

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

  try {
    const gate = await evaluateReadiness(supabase, user.id);
    logger.info('readiness evaluated', {
      userId: user.id,
      pass: gate.pass,
      missing: gate.missing,
      summary: gate.summary,
      requestId,
    });
    return res.status(200).json({ pass: gate.pass, missing: gate.missing, summary: gate.summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to evaluate readiness';
    logger.error('failed to evaluate readiness', { error: message, userId: user.id, requestId });
    return res.status(500).json({ error: message });
  }
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
