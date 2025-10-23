// pages/api/ai/writing/score-v2.ts
// Second-pass scoring endpoint that enriches the baseline heuristics with
// rewrite suggestions and highlight metadata.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { scoreEssay } from '@/lib/writing/scoring';
import { sanitiseWritingErrors } from '@/lib/writing/diff';
import { writingScoreV2RequestSchema } from '@/lib/validation/writing.v2';
import type { WritingCriterion, WritingFeedbackBlock, WritingError } from '@/types/writing';

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

  const parsed = writingScoreV2RequestSchema.safeParse(req.body);
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
    user_id: user.id,
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

  const { data: responseRow, error: upsertError } = await supabase
    .from('writing_responses')
    .upsert(upsertPayload, { onConflict: 'exam_attempt_id,task' })
    .select('id')
    .maybeSingle();

  if (upsertError) {
    console.error('[writing/score-v2] upsert failed', upsertError);
    return res.status(500).json({ error: 'Failed to persist score' });
  }

  if (responseRow?.id) {
    const { error: feedbackError } = await supabase
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
      console.error('[writing/score-v2] feedback insert failed', feedbackError);
    }
  }

  if (attemptId) {
    const { error: eventError } = await supabase.from('exam_events').insert({
      attempt_id: attemptId,
      user_id: user.id,
      event_type: 'score',
      payload: {
        task: payload.task,
        version: 'v2',
        event: 'writing.score.v2',
        score: result,
      },
    });
    if (eventError) {
      console.error('[writing/score-v2] event insert failed', eventError);
    }
  }

  return ok(res, { ok: true, result });
}
