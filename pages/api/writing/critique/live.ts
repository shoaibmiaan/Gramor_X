import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { critiqueText } from '@/lib/writing/languageTools';
import { z } from 'zod';

const Body = z.object({
  text: z.string().max(25000),
});

type Data =
  | {
      suggestions: ReturnType<typeof critiqueText>;
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/critique/live', { requestId });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid critique payload', { requestId, issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('unauthorised critique request', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const suggestions = critiqueText(parsed.data.text);
  logger.info('live critique generated', { userId: user.id, suggestionCount: suggestions.length, requestId });

  return res.status(200).json({ suggestions });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
