import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { RehearsalSimilarBody } from '@/lib/writing/schemas';

type Suggestion = { id: string; slug: string; topic: string };

type Data = { suggestions: Suggestion[] } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = RehearsalSimilarBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { promptId } = parsed.data;

  const { data: sourcePrompt, error: promptError } = await supabase
    .from('writing_prompts')
    .select('id, task_type')
    .eq('id', promptId)
    .single();

  if (promptError || !sourcePrompt) {
    return res.status(404).json({ error: promptError?.message ?? 'Prompt not found' });
  }

  const { data, error } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic')
    .eq('task_type', sourcePrompt.task_type)
    .neq('id', sourcePrompt.id)
    .limit(3);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ suggestions: data ?? [] });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
