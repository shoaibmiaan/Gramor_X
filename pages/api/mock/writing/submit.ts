// pages/api/mock/writing/submit.ts
// Finalises a writing attempt and triggers local scoring.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { normalizeScorePayload, scoreEssay } from '@/lib/writing/scoring';
import { writingSubmitSchema } from '@/lib/validation/writing';
import type { WritingTaskType } from '@/types/writing';

const TASKS: WritingTaskType[] = ['task1', 'task2'];

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

  const parsed = writingSubmitSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const { attemptId, tasks, durationSeconds } = parsed.data;
  if (!tasks.task1 && !tasks.task2) {
    return res.status(400).json({ error: 'At least one task response is required' });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError || !attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }
  if (attempt.user_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const results: Record<WritingTaskType, ReturnType<typeof normalizeScorePayload> | undefined> = {
    task1: undefined,
    task2: undefined,
  };

  for (const task of TASKS) {
    const submission = tasks[task];
    if (!submission) continue;

    let wordTarget: number | undefined;
    if (submission.promptId) {
      const { data: promptRow } = await supabase
        .from('writing_prompts')
        .select('word_target')
        .eq('id', submission.promptId)
        .maybeSingle();
      if (promptRow?.word_target) wordTarget = promptRow.word_target;
    }

    const score = scoreEssay({
      essay: submission.essay,
      task,
      wordTarget,
      durationSeconds,
    });

    const { error: upsertError } = await supabase
      .from('writing_responses')
      .upsert(
        {
          user_id: user.id,
          exam_attempt_id: attemptId,
          prompt_id: submission.promptId ?? null,
          task,
          task_type: task,
          answer_text: submission.essay,
          word_count: score.wordCount,
          duration_seconds: durationSeconds ?? null,
          evaluation_version: score.version,
          band_scores: score.bandScores,
          feedback: score.feedback,
          overall_band: score.overallBand,
          task_response_band: score.bandScores.task_response,
          coherence_band: score.bandScores.coherence_and_cohesion,
          lexical_band: score.bandScores.lexical_resource,
          grammar_band: score.bandScores.grammatical_range,
          tokens_used: score.tokensUsed ?? 0,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'exam_attempt_id,task' },
      );
    if (upsertError) {
      console.error('[writing/submit] upsert failed', upsertError);
    }

    results[task] = normalizeScorePayload(score);
  }

  await supabase
    .from('exam_attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      duration_seconds: durationSeconds ?? attempt.duration_seconds ?? null,
    })
    .eq('id', attemptId);

  await supabase.from('exam_events').insert({
    attempt_id: attemptId,
    user_id: user.id,
    event_type: 'submit',
    payload: {
      durationSeconds,
    },
  });

  return res.status(200).json({ ok: true, attemptId, results });
}
