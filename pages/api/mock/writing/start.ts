// pages/api/mock/writing/start.ts
// Creates an exam_attempts row and returns the prompts required for the session.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { writingStartSchema } from '@/lib/validation/writing';
import type { WritingPrompt } from '@/types/writing';

const mapPrompt = (row: any): WritingPrompt => ({
  id: row.id,
  slug: row.slug ?? row.id,
  title: row.title,
  promptText: row.prompt_text,
  taskType: row.task_type ?? 'task2',
  module: row.module ?? 'academic',
  difficulty: row.difficulty ?? 'medium',
  source: row.source ?? undefined,
  tags: row.tags ?? undefined,
  estimatedMinutes: row.estimated_minutes ?? undefined,
  wordTarget: row.word_target ?? undefined,
  metadata: row.metadata ?? undefined,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = writingStartSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const { promptId, goalBand } = parsed.data;

  const { data: task1Row, error: task1Error } = await supabase
    .from('writing_prompts')
    .select('*')
    .eq('task_type', 'task1')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (task1Error || !task1Row) {
    return res.status(500).json({ error: 'Task 1 prompt unavailable' });
  }

  let task2Row = null;
  if (promptId) {
    const { data } = await supabase
      .from('writing_prompts')
      .select('*')
      .or(`id.eq.${promptId},slug.eq.${promptId}`)
      .maybeSingle();
    task2Row = data;
  }
  if (!task2Row) {
    const { data, error } = await supabase
      .from('writing_prompts')
      .select('*')
      .eq('task_type', 'task2')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      return res.status(500).json({ error: 'Task 2 prompt unavailable' });
    }
    task2Row = data;
  }

  const durationSeconds = 60 * 60;

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .insert({
      user_id: user.id,
      exam_type: 'writing',
      status: 'in_progress',
      duration_seconds: durationSeconds,
      goal_band: goalBand ?? null,
      metadata: {
        promptIds: {
          task1: task1Row.id,
          task2: task2Row.id,
        },
      },
    })
    .select('*')
    .single();

  if (attemptError || !attempt) {
    return res.status(500).json({ error: 'Failed to create attempt' });
  }

  await supabase.from('exam_events').insert({
    attempt_id: attempt.id,
    user_id: user.id,
    event_type: 'start',
    payload: {
      promptIds: {
        task1: task1Row.id,
        task2: task2Row.id,
      },
    },
  });

  return res.status(200).json({
    ok: true,
    attempt: {
      id: attempt.id,
      startedAt: attempt.started_at,
      durationSeconds: attempt.duration_seconds ?? durationSeconds,
      status: attempt.status,
    },
    prompts: {
      task1: mapPrompt(task1Row),
      task2: mapPrompt(task2Row),
    },
  });
}
