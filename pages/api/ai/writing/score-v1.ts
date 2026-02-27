// pages/api/ai/writing/score-v1.ts
// Baseline deterministic scorer for writing attempts.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { normalizeScorePayload, scoreEssay } from '@/lib/writing/scoring';
import { writingScoreRequestSchema } from '@/lib/validation/writing';
import type { PlanId } from '@/types/pricing';
import { evaluateQuota, upgradeAdvice, getUtcDayWindow } from '@/lib/plan/quotas';

async function resolvePlanId(supabase: ReturnType<typeof getServerClient>, userId: string): Promise<PlanId> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('plan_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (data?.plan_id) return data.plan_id as PlanId;
  } catch { /* ignore */ }
  return 'starter' as PlanId;
}

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

  // —— QUOTA: aiEvaluationsPerDay ——
  try {
    const plan = await resolvePlanId(supabase, user.id);
    const { startIso, endIso } = getUtcDayWindow();
    const { count: used = 0 } = await supabase
      .from('writing_responses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('submitted_at', startIso)
      .lt('submitted_at', endIso);

    const snap = evaluateQuota(plan, 'aiEvaluationsPerDay', used);
    if (!snap.isUnlimited && snap.remaining < 1) {
      const advice = upgradeAdvice(plan, 'aiEvaluationsPerDay', used);
      return res.status(402).json({
        error: 'Quota exceeded',
        quota: { key: 'aiEvaluationsPerDay', limit: snap.limit, used: snap.used, remaining: snap.remaining },
        advice,
      });
    }
  } catch {
    // Non-fatal: if counting fails, do not block
  }
  // —— /QUOTA ——

  const parsed = writingScoreRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const payload = parsed.data;

  let wordTarget: number | undefined;
  if (payload.promptId) {
    const { data: promptRow } = await supabase
      .from('writing_prompts')
      .select('word_target, task_type')
      .eq('id', payload.promptId)
      .maybeSingle();
    if (promptRow?.word_target) wordTarget = promptRow.word_target;
    if (!payload.task && promptRow?.task_type) {
      payload.task = promptRow.task_type as typeof payload.task;
    }
  }

  const score = scoreEssay({
    essay: payload.essay,
    task: payload.task,
    wordTarget,
    durationSeconds: payload.durationSeconds,
  });

  const attemptId = payload.examAttemptId ?? payload.attemptId ?? null;
  const nowIso = new Date().toISOString();

  const { error: upsertError } = await supabase
    .from('writing_responses')
    .upsert(
      {
        user_id: user.id,
        exam_attempt_id: attemptId,
        prompt_id: payload.promptId ?? null,
        task: payload.task,
        task_type: payload.task,
        answer_text: payload.essay,
        word_count: score.wordCount,
        duration_seconds: payload.durationSeconds ?? null,
        evaluation_version: score.version,
        band_scores: score.bandScores,
        feedback: score.feedback,
        overall_band: score.overallBand,
        task_response_band: score.bandScores.task_response,
        coherence_band: score.bandScores.coherence_and_cohesion,
        lexical_band: score.bandScores.lexical_resource,
        grammar_band: score.bandScores.grammatical_range,
        tokens_used: score.tokensUsed ?? 0,
        submitted_at: nowIso,
      },
      { onConflict: 'exam_attempt_id,task' },
    );
  if (upsertError) {
    console.error('[writing/score-v1] upsert failed', upsertError);
    return res.status(500).json({ error: 'Failed to persist score' });
  }

  if (attemptId) {
    const { error: eventError } = await supabase.from('exam_events').insert({
      attempt_id: attemptId,
      user_id: user.id,
      event_type: 'score',
      payload: {
        task: payload.task,
        score: normalizeScorePayload(score),
      },
    });
    if (eventError) {
      console.error('[writing/score-v1] event insert failed', eventError);
    }
  }

  return res.status(200).json({
    ok: true,
    result: normalizeScorePayload(score),
  });
}
