// pages/api/mock/writing/submit.ts
// Finalises a writing attempt and triggers local scoring.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { normalizeScorePayload } from '@/lib/writing/scoring';
import { evaluateEssayWithAi } from '@/lib/writing/ai-evaluator';
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
    let promptRow: any = null;
    if (submission.promptId) {
      const { data: promptData } = await supabase
        .from('writing_prompts')
        .select('id, title, topic, prompt_text, module, difficulty, word_target')
        .eq('id', submission.promptId)
        .maybeSingle();
      if (promptData) {
        promptRow = promptData;
      }
      if (promptData?.word_target) wordTarget = promptData.word_target;
    }

    const evaluation = await evaluateEssayWithAi({
      essay: submission.essay,
      task,
      wordTarget,
      durationSeconds,
      prompt: promptRow
        ? {
            title: typeof promptRow.title === 'string' && promptRow.title
              ? promptRow.title
              : typeof promptRow.topic === 'string'
                ? promptRow.topic
                : null,
            promptText: typeof promptRow.prompt_text === 'string' ? promptRow.prompt_text : null,
            module: typeof promptRow.module === 'string' ? promptRow.module : null,
            difficulty: typeof promptRow.difficulty === 'string' ? promptRow.difficulty : null,
          }
        : undefined,
    });

    const responsePayload = {
      user_id: user.id,
      exam_attempt_id: attemptId,
      prompt_id: submission.promptId ?? null,
      task,
      task_type: task,
      answer_text: submission.essay,
      word_count: evaluation.score.wordCount,
      duration_seconds: evaluation.score.durationSeconds ?? durationSeconds ?? null,
      evaluation_version: evaluation.score.version,
      band_scores: evaluation.score.bandScores,
      feedback: evaluation.score.feedback,
      overall_band: evaluation.score.overallBand,
      task_response_band: evaluation.score.bandScores.task_response,
      coherence_band: evaluation.score.bandScores.coherence_and_cohesion,
      lexical_band: evaluation.score.bandScores.lexical_resource,
      grammar_band: evaluation.score.bandScores.grammatical_range,
      tokens_used: evaluation.score.tokensUsed ?? null,
      submitted_at: new Date().toISOString(),
    };

    const { data: responseRows, error: upsertError } = await supabase
      .from('writing_responses')
      .upsert(responsePayload, { onConflict: 'exam_attempt_id,task' })
      .select('id');

    if (upsertError) {
      console.error('[writing/submit] upsert failed', upsertError);
    }

    let responseId: string | null = null;
    if (Array.isArray(responseRows) && responseRows.length > 0) {
      responseId = responseRows[0]?.id ?? null;
    } else if (responseRows && typeof responseRows === 'object' && 'id' in responseRows) {
      responseId = (responseRows as { id?: string }).id ?? null;
    }

    if (!responseId) {
      const { data: existingRow } = await supabase
        .from('writing_responses')
        .select('id')
        .eq('exam_attempt_id', attemptId)
        .eq('task', task)
        .maybeSingle();
      responseId = existingRow?.id ?? null;
    }

    if (responseId) {
      await supabase
        .from('writing_feedback')
        .upsert(
          {
            attempt_id: responseId,
            band9_rewrite: evaluation.extras.band9Rewrite ?? null,
            errors: evaluation.extras.errors ?? [],
            blocks: evaluation.extras.blocks ?? [],
          },
          { onConflict: 'attempt_id' },
        );
    }

    results[task] = normalizeScorePayload(evaluation.score);
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
