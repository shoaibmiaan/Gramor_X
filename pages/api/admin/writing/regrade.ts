import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ attemptId: z.string().uuid() });

export async function regradeHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: PlanGuardContext,
  adminClient = supabaseAdmin,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!adminClient) {
    res.status(500).json({ error: 'Admin client not configured' });
    return;
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
    return;
  }

  const { attemptId } = parsed.data;

  const { data: attempt, error: attemptError } = await adminClient
    .from('exam_attempts')
    .select('id, user_id')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    res.status(404).json({ error: 'Attempt not found' });
    return;
  }

  await adminClient
    .from('writing_responses')
    .update({ evaluation_version: null })
    .eq('exam_attempt_id', attemptId);

  const { error: eventError } = await adminClient.from('exam_events').insert({
    attempt_id: attemptId,
    user_id: attempt.user_id,
    event_type: 'admin_regrade',
    payload: {
      source: 'admin-panel',
      requestedBy: ctx.user.id,
      timestamp: new Date().toISOString(),
    },
  });

  if (eventError) {
    res.status(500).json({ error: 'Failed to queue regrade' });
    return;
  }

  res.status(200).json({ ok: true });
}

export default withPlan('master', regradeHandler, {
  allowRoles: ['admin', 'teacher'],
  killSwitchFlag: 'killSwitchWriting',
});

