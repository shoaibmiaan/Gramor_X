import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { RehearsalSimilarBody } from '@/lib/writing/schemas';

type Suggestion = { id: string; slug: string; topic: string };

type Data = { suggestions: Suggestion[] } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/rehearsals/similar', { requestId });

  const parsed = RehearsalSimilarBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid payload', { issues: parsed.error.flatten(), requestId });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised rehearsal suggestion', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { promptId } = parsed.data;

  const { data: sourcePrompt, error: promptError } = await supabase
    .from('writing_prompts')
    .select('id, task_type')
    .eq('id', promptId)
    .single();

  if (promptError || !sourcePrompt) {
    logger.warn('source prompt not found', { promptId, requestId });
    return res.status(404).json({ error: promptError?.message ?? 'Prompt not found' });
  }

  const { data, error } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic')
    .eq('task_type', sourcePrompt.task_type)
    .neq('id', sourcePrompt.id)
    .limit(20);

  if (error) {
    logger.error('failed to load rehearsal suggestions', { error: error.message, userId: user.id, promptId, requestId });
    return res.status(500).json({ error: error.message });
  }

  const keywords = new Set(
    sourcePrompt.topic
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3),
  );

  const ranked = (data ?? [])
    .map((row) => {
      const tokens = row.topic
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 3);
      const overlap = tokens.reduce((acc, token) => (keywords.has(token) ? acc + 1 : acc), 0);
      return { ...row, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || a.topic.localeCompare(b.topic))
    .slice(0, 3)
    .map(({ overlap: _overlap, ...rest }) => rest);

  logger.info('rehearsal suggestions generated', { promptId, userId: user.id, suggestions: ranked.map((item) => item.slug) });

  return res.status(200).json({ suggestions: ranked });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
