import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { paraphraseSentence } from '@/lib/writing/languageTools';
import { z } from 'zod';

const Body = z.object({
  sentence: z.string().max(400),
});

type Data =
  | {
      options: ReturnType<typeof paraphraseSentence>;
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/paraphrase/suggest', { requestId });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid paraphrase payload', { requestId, issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('unauthorised paraphrase request', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const options = paraphraseSentence(parsed.data.sentence);
  logger.info('paraphrases generated', { userId: user.id, optionCount: options.length, requestId });

  return res.status(200).json({ options });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
