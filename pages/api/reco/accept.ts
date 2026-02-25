import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  recommendationId: z.string().uuid(),
});

type AcceptResponse = { ok: boolean; deeplink?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<AcceptResponse | { error: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const recommendationId = parse.data.recommendationId;

  const { data: recommendation, error: fetchError } = await supabase
    .from('recommendations')
    .select('id, user_id, status, task_id')
    .eq('id', recommendationId)
    .maybeSingle();

  if (fetchError || !recommendation || recommendation.user_id !== user.id) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }

  if (recommendation.status === 'completed') {
    return res.status(200).json({ ok: true });
  }

  const { data: task } = await supabase
    .from('learning_tasks')
    .select('metadata')
    .eq('id', recommendation.task_id)
    .maybeSingle();

  const metadata = (task as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
  const deeplink = typeof metadata.deeplink === 'string' ? metadata.deeplink : '/learning';

  const { error: updateError } = await supabase
    .from('recommendations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', recommendationId)
    .eq('user_id', user.id);

  if (updateError) {
    // eslint-disable-next-line no-console
    console.error('[reco] failed to mark recommendation accepted', updateError);
    return res.status(500).json({ error: 'Failed to accept recommendation' });
  }

  return res.status(200).json({ ok: true, deeplink });
}
