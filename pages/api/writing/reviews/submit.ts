import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { ReviewSubmitBody } from '@/lib/writing/schemas';

type Data = { ok: true } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = ReviewSubmitBody.safeParse(req.body);
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

  const { attemptId, role, scores, comments } = parsed.data;

  const { error } = await supabase
    .from('writing_reviews')
    .insert({
      attempt_id: attemptId,
      reviewer_id: user.id,
      role,
      scores_json: scores ?? null,
      comments_json: comments ?? null,
    });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
