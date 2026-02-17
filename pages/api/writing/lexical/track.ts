import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { lexicalVarietyReport } from '@/lib/writing/languageTools';
import { z } from 'zod';

const Body = z.object({
  text: z.string().max(25000),
  timeSpentMs: z.number().int().nonnegative().default(0),
});

type Data =
  | {
      report: ReturnType<typeof lexicalVarietyReport>;
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/lexical/track', { requestId });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid lexical payload', { requestId, issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('unauthorised lexical request', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const report = lexicalVarietyReport(parsed.data.text, parsed.data.timeSpentMs);
  logger.info('lexical report generated', { userId: user.id, requestId, report });

  return res.status(200).json({ report });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
