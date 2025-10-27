import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { RedraftBody } from '@/lib/writing/schemas';

type Data = { attemptId: string } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = RedraftBody.safeParse(req.body);
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

  const { sourceAttemptId } = parsed.data;

  const { data: sourceAttempt, error: sourceError } = await supabase
    .from('writing_attempts')
    .select('prompt_id, task_type')
    .eq('id', sourceAttemptId)
    .eq('user_id', user.id)
    .single();

  if (sourceError || !sourceAttempt) {
    return res.status(404).json({ error: sourceError?.message ?? 'Attempt not found' });
  }

  const { data, error } = await supabase
    .from('writing_attempts')
    .insert({
      user_id: user.id,
      prompt_id: sourceAttempt.prompt_id,
      task_type: sourceAttempt.task_type,
      version_of: sourceAttemptId,
    })
    .select('id')
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'Failed to create redraft' });
  }

  return res.status(200).json({ attemptId: data.id });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
