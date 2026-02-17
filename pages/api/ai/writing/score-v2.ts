// pages/api/ai/writing/score-v2.ts
// Second-pass scoring endpoint that enriches the baseline heuristics with
// rewrite suggestions and highlight metadata.

import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan, type PlanGuardContext } from '@/lib/plan/withPlan';
import { createRequestLogger } from '@/lib/obs/logger';
import { recordSloSample } from '@/lib/obs/slo';
import { applyRateLimit } from '@/lib/limits/rate';
import { scoreEssay } from '@/lib/writing/scoring';
import { sanitiseWritingErrors } from '@/lib/writing/diff';
import { writingScoreV2RequestSchema } from '@/lib/validation/writing.v2';
import type { WritingCriterion, WritingFeedbackBlock, WritingError } from '@/types/writing';
import { evaluateQuota, upgradeAdvice, getUtcDayWindow } from '@/lib/plan/quotas';

const ROUTE = 'ai.writing.score-v2';
const RATE_LIMIT = { windowMs: 60_000, max: 12 } as const;
const SLO_TARGET_MS = 4000;

const CRITERION_LABEL: Record<WritingCriterion, string> = {
  task_response: 'Task Response',
  coherence_and_cohesion: 'Coherence & Cohesion',
  lexical_resource: 'Lexical Resource',
  grammatical_range: 'Grammatical Range',
};

const capitalise = (value: string) => {
  if (!value) return value;
  return value
    .split(/([.!?]\s+)/)
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) return segment;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join('');
};

const buildBand9Rewrite = (essay: string) => {
  const cleaned = essay
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => capitalise(paragraph.replace(/\b(very|really)\b/gi, 'exceedingly')));
  return cleaned.join('\n\n');
};

const detectRepetition = (essay: string): WritingError[] => {
  const matches = essay.match(/\b(\w+)\b(?=[^\w]+\1\b)/gi) ?? [];
  const unique = Array.from(new Set(matches.map((token) => token.toLowerCase()))).slice(0, 5);
  return unique.map((word) => {
    const excerpt = `Repeated use of "${word}"`;
    return {
      type: 'lexical',
      excerpt,
      message: `The word "${word}" is repeated. Consider replacing with a synonym.`,
      suggestion: `Introduce a synonym for "${word}" to demonstrate lexical range.`,
      severity: 'medium' as const,
    } satisfies WritingError;
  });
};

const detectShortParagraphs = (essay: string): WritingError[] => {
  const paragraphs = essay.split(/\n+/).filter((p) => p.trim().length > 0);
  return paragraphs
    .map((paragraph, index) => {
      if (paragraph.length >= 120) return null;
      return {
        type: 'coherence',
        excerpt: paragraph.trim().slice(0, 120),
        message: `Paragraph ${index + 1} is brief. Develop the idea further for cohesion.`,
        suggestion: 'Add supporting evidence or examples to strengthen this paragraph.',
        severity: 'low' as const,
      } satisfies WritingError;
    })
    .filter(Boolean) as WritingError[];
};

const detectSentenceFragments = (essay: string): WritingError[] => {
  const sentences = essay.split(/(?<=[.!?])\s+/);
  return sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !/[.!?]$/.test(sentence))
    .slice(0, 3)
    .map((sentence) =>
      ({
        type: 'grammar',
        excerpt: sentence.slice(0, 140),
        message: 'Sentence appears to be missing an ending punctuation mark.',
        suggestion: 'Ensure each sentence has proper punctuation and forms a complete thought.',
        severity: 'medium' as const,
      }) satisfies WritingError,
    );
};

const buildFocusBlocks = (
  bands: Record<WritingCriterion, number>,
  feedback: Record<WritingCriterion, { feedback: string }>,
): WritingFeedbackBlock[] => {
  const entries = Object.entries(bands).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return entries.map(([criterion, band], index) => {
    const typedCriterion = criterion as WritingCriterion;
    const weight = Number(Math.min(1, Math.max(0.25, (9 - band) / 6)).toFixed(2));
    return {
      tag: `writing-${typedCriterion}`,
      title: `${CRITERION_LABEL[typedCriterion]} focus`,
      description: feedback[typedCriterion]?.feedback ?? 'Deepen this criterion to unlock higher bands.',
      weight,
      criterion: typedCriterion,
      action: index === 0 ? 'Review guided drills in study plan' : undefined,
    } satisfies WritingFeedbackBlock;
  });
};

const ok = (res: NextApiResponse, payload: Record<string, unknown>) => res.status(200).json(payload);

async function handler(req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) {
  const start = Date.now();
  const logger = createRequestLogger(ROUTE, {
    requestId: req.headers['x-request-id'] as string | undefined,
    userId: ctx.user.id,
    plan: ctx.plan,
  });

  const finish = (status: number) => {
    recordSloSample({ route: ROUTE, durationMs: Date.now() - start, status, targetMs: SLO_TARGET_MS });
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    finish(405);
    return;
  }

  try {
    const ipHeader = req.headers['x-forwarded-for'];
    const ip = Array.isArray(ipHeader)
      ? ipHeader[0]
      : ipHeader?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    const rateResult = await applyRateLimit(
      { route: 'ai:writing:score-v2', identifier: `user:${ctx.user.id}:ip:${ip}`, userId: ctx.user.id },
      { windowMs: RATE_LIMIT.windowMs, max: RATE_LIMIT.max },
    );

    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, rateResult.remaining)));

    if (rateResult.blocked) {
      const retryAfter = Math.max(1, rateResult.retryAfter || Math.ceil(RATE_LIMIT.windowMs / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many requests', retryAfter });
      logger.warn('rate limit blocked', { retryAfter, hits: rateResult.hits });
      finish(429);
      return;
    }

    // —— QUOTA: aiEvaluationsPerDay ——
    try {
      const { startIso, endIso } = getUtcDayWindow();
      const { count: used = 0 } = await ctx.supabase
        .from('writing_responses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .gte('submitted_at', startIso)
        .lt('submitted_at', endIso);

      const snap = evaluateQuota(ctx.plan, 'aiEvaluationsPerDay', used);
      if (!snap.isUnlimited && snap.remaining < 1) {
        const advice = upgradeAdvice(ctx.plan, 'aiEvaluationsPerDay', used);
        res.status(402).json({
          error: 'Quota exceeded',
          quota: { key: 'aiEvaluationsPerDay', limit: snap.limit, used: snap.used, remaining: snap.remaining },
          advice,
        });
        finish(402);
        return;
      }
    } catch {
      // No block if counting fails
    }
    // —— /QUOTA ——

    const parsed = writingScoreV2RequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.flatten();
      res.status(400).json({ error: 'Invalid payload', issues });
      logger.warn('invalid payload', { issues });
      finish(400);
      return;
    }

    const payload = parsed.data;

    let wordTarget: number | undefined;
    if (payload.promptId) {
      const { data: promptRow, error: promptError } = await ctx.supabase
        .from('writing_prompts')
        .select('word_target, task_type')
        .eq('id', payload.promptId)
        .maybeSingle();
      if (promptError) {
        logger.error('failed to load prompt metadata', { promptId: payload.promptId, error: promptError.message });
      }
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

    const rewrite = buildBand9Rewrite(payload.essay);
    const heuristicsErrors = [
      ...detectRepetition(payload.essay),
      ...detectShortParagraphs(payload.essay),
      ...detectSentenceFragments(payload.essay),
    ];
    const errors = sanitiseWritingErrors(payload.essay, heuristicsErrors);
    const blocks = buildFocusBlocks(score.bandScores, score.feedback.perCriterion);

    const enrichedFeedback = {
      ...score.feedback,
      band9Rewrite: rewrite,
      errors,
      blocks,
    };

    const result = {
      version: 'v2',
      overallBand: score.overallBand,
      bandScores: score.bandScores,
      feedback: enrichedFeedback,
      wordCount: score.wordCount,
      durationSeconds: score.durationSeconds,
      tokensUsed: score.tokensUsed ?? 0,
    };

    const attemptId = payload.examAttemptId ?? payload.attemptId ?? null;
    const nowIso = new Date().toISOString();

    const upsertPayload = {
      user_id: ctx.user.id,
      exam_attempt_id: attemptId,
      prompt_id: payload.promptId ?? null,
      task: payload.task,
      task_type: payload.task,
      answer_text: payload.essay,
      word_count: score.wordCount,
      duration_seconds: payload.durationSeconds ?? null,
      evaluation_version: 'v2',
      band_scores: score.bandScores,
      feedback: enrichedFeedback,
      overall_band: score.overallBand,
      task_response_band: score.bandScores.task_response,
      coherence_band: score.bandScores.coherence_and_cohesion,
      lexical_band: score.bandScores.lexical_resource,
      grammar_band: score.bandScores.grammatical_range,
      tokens_used: score.tokensUsed ?? 0,
      submitted_at: nowIso,
    };

    const { data: responseRow, error: upsertError } = await ctx.supabase
      .from('writing_responses')
      .upsert(upsertPayload, { onConflict: 'exam_attempt_id,task' })
      .select('id')
      .maybeSingle();

    if (upsertError) {
      logger.error('failed to persist writing response', { error: upsertError.message });
      res.status(500).json({ error: 'Failed to persist score' });
      finish(500);
      return;
    }

    if (responseRow?.id) {
      const { error: feedbackError } = await ctx.supabase
        .from('writing_feedback')
        .upsert(
          {
            attempt_id: responseRow.id,
            band9_rewrite: rewrite,
            errors,
            blocks,
            created_at: nowIso,
          },
          { onConflict: 'attempt_id' },
        );
      if (feedbackError) {
        logger.warn('failed to upsert feedback', { attemptId: responseRow.id, error: feedbackError.message });
      }
    }

    if (attemptId) {
      const { error: eventError } = await ctx.supabase.from('exam_events').insert({
        attempt_id: attemptId,
        user_id: ctx.user.id,
        event_type: 'score',
        payload: {
          task: payload.task,
          version: 'v2',
          event: 'writing.score.v2',
          score: result,
        },
      });
      if (eventError) {
        logger.warn('failed to log exam event', { attemptId, error: eventError.message });
      }
    }

    logger.info('scored writing response', {
      attemptId: attemptId ?? undefined,
      responseId: responseRow?.id,
      task: payload.task,
      overallBand: score.overallBand,
    });

    ok(res, { ok: true, result });
    finish(200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const logger = createRequestLogger(ROUTE, { userId: ctx.user.id, plan: ctx.plan });
    logger.error('unhandled error scoring writing response', { error: message });
    res.status(500).json({ error: 'Failed to score writing response' });
  }
}

// Attach quota guard via withPlan (consumes 1 evaluation)
export default withPlan('starter', handler, {
  allowRoles: ['admin', 'teacher'],
  killSwitchFlag: 'killSwitchWriting',
  quota: {
    key: 'aiEvaluationsPerDay',
    amount: 1,
    // count from writing_responses submitted today
    getUsedToday: async ({ supabase, user }) => {
      const { startIso, endIso } = getUtcDayWindow();
      const { count = 0 } = await supabase
        .from('writing_responses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('submitted_at', startIso)
        .lt('submitted_at', endIso);
      return count;
    },
  },
});
