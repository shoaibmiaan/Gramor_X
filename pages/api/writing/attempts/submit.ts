import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { SubmitBody } from '@/lib/writing/schemas';

interface AcceptedResponse { accepted: true; attemptId: string }

type Data = AcceptedResponse | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = SubmitBody.safeParse(req.body);
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

  const { attemptId } = parsed.data;

  const { error } = await supabase
    .from('writing_attempts')
    .update({ status: 'submitted' })
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .select('id')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // TODO: enqueue scoring job via background worker
  return res.status(202).json({ accepted: true, attemptId });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
