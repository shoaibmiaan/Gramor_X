import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { deriveSignalsFromOutcome, refreshLearningProfile } from '@/lib/reco/profile';
import type { LearningTask } from '@/types/supabase';

const Body = z.object({
  taskId: z.string().uuid(),
  recommendationId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  outcome: z.record(z.any()).optional(),
  bandDelta: z.number().optional(),
});

type CompleteResponse = { ok: boolean; taskRunId: string | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse<CompleteResponse | { error: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() as unknown });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { taskId, recommendationId, startedAt, completedAt, outcome, bandDelta } = parse.data;

  const { data: taskRow, error: taskError } = await supabase
    .from('learning_tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError || !taskRow) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { data: runInsertion, error: runError } = await supabase
    .from('task_runs')
    .insert({
      user_id: user.id,
      task_id: taskId,
      recommendation_id: recommendationId ?? null,
      started_at: startedAt,
      completed_at: completedAt,
      outcome: outcome ?? null,
      band_delta: typeof bandDelta === 'number' ? bandDelta : null,
    })
    .select('id')
    .single();

  if (runError) {
    // eslint-disable-next-line no-console
    console.error('[reco] failed to insert task_run', runError);
    return res.status(500).json({ error: 'Failed to store task run' });
  }

  if (recommendationId) {
    const { error: statusError } = await supabase
      .from('recommendations')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', recommendationId)
      .eq('user_id', user.id);

    if (statusError) {
      // eslint-disable-next-line no-console
      console.error('[reco] failed to mark recommendation completed', statusError);
    }
  }

  const completedDate = new Date(completedAt);
  const signals = deriveSignalsFromOutcome(taskRow as LearningTask, outcome ?? null, completedDate);

  if (signals.length) {
    const rows = signals.map((signal) => ({
      user_id: user.id,
      module: signal.module,
      key: signal.key,
      value: signal.value,
      source: signal.source,
      occurred_at: signal.occurred_at,
    }));

    const { error: signalError } = await supabase.from('learning_signals').insert(rows);
    if (signalError) {
      // eslint-disable-next-line no-console
      console.error('[reco] failed to insert learning_signals', signalError);
    }
  }

  await refreshLearningProfile(supabase, user.id);

  return res.status(200).json({ ok: true, taskRunId: runInsertion.data?.id ?? null });
}
