// lib/writing/ai-evaluator.ts
// AI-assisted evaluator for IELTS writing tasks. Falls back to the baseline
// heuristic scorer whenever the language model is unavailable or returns an
// invalid payload.

import { z } from 'zod';

import { ai, AI_MODEL, AI_PROVIDER } from '@/lib/ai';
import { scoreEssay } from '@/lib/writing/scoring';
import type {
  WritingCriterion,
  WritingFeedbackBlock,
  WritingScorePayload,
  WritingTaskType,
  WritingError,
} from '@/types/writing';

type CriterionBand = { band?: number; feedback?: string };

const CRITERIA: WritingCriterion[] = [
  'task_response',
  'coherence_and_cohesion',
  'lexical_resource',
  'grammatical_range',
];

const AiResponseSchema = z
  .object({
    overallBand: z.number(),
    bandScores: z.object({
      task_response: z.number(),
      coherence_and_cohesion: z.number(),
      lexical_resource: z.number(),
      grammatical_range: z.number(),
    }),
    feedback: z
      .object({
        summary: z.string().optional(),
        strengths: z.array(z.string()).optional(),
        improvements: z.array(z.string()).optional(),
        perCriterion: z
          .record(
            z
              .object({ band: z.number().optional(), feedback: z.string().optional() })
              .partial(),
          )
          .optional(),
        band9Rewrite: z.string().optional(),
        errors: z.any().optional(),
        blocks: z.any().optional(),
      })
      .optional(),
  })
  .passthrough();

const HALF_STEP = 0.5;

const clampBand = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    value = parsed;
  }
  if (!Number.isFinite(value as number)) return fallback;
  const clamped = Math.max(0, Math.min(9, value as number));
  return Math.round(clamped / HALF_STEP) * HALF_STEP;
};

const ensureStringArray = (value: unknown, fallback: string[], min = 1): string[] => {
  const arr = Array.isArray(value) ? value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
  if (arr.length >= min) return arr.slice(0, 6);
  return fallback.slice(0, Math.max(min, fallback.length));
};

const KNOWN_ERROR_TYPES: WritingError['type'][] = ['grammar', 'lexical', 'coherence', 'task', 'general'];
const KNOWN_SEVERITIES: NonNullable<WritingError['severity']>[] = ['low', 'medium', 'high'];

const sanitiseErrors = (value: unknown): WritingError[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry as Record<string, unknown>;
      const excerpt = typeof raw.excerpt === 'string' ? raw.excerpt.trim() : '';
      if (!excerpt) return null;
      const typeCandidate = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
      const severityCandidate = typeof raw.severity === 'string' ? raw.severity.toLowerCase() : '';
      const suggestion = typeof raw.suggestion === 'string' ? raw.suggestion.trim() : undefined;
      const replacements = Array.isArray(raw.replacements)
        ? raw.replacements.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
        : undefined;
      return {
        type: (KNOWN_ERROR_TYPES.includes(typeCandidate as WritingError['type'])
          ? (typeCandidate as WritingError['type'])
          : 'general') as WritingError['type'],
        excerpt,
        suggestion,
        severity: (KNOWN_SEVERITIES.includes(severityCandidate as any)
          ? (severityCandidate as WritingError['severity'])
          : 'medium') as WritingError['severity'],
        replacements,
      } satisfies WritingError;
    })
    .filter(Boolean)
    .slice(0, 10) as WritingError[];
};

const sanitiseBlocks = (value: unknown): WritingFeedbackBlock[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry as Record<string, unknown>;
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      const description = typeof raw.description === 'string' ? raw.description.trim() : '';
      if (!title || !description) return null;
      const weightValue = typeof raw.weight === 'number' && Number.isFinite(raw.weight)
        ? Math.min(1, Math.max(0, raw.weight))
        : undefined;
      const criterionCandidate = typeof raw.criterion === 'string' ? raw.criterion : undefined;
      const criterion = CRITERIA.includes(criterionCandidate as WritingCriterion) || criterionCandidate === 'overall'
        ? (criterionCandidate as WritingFeedbackBlock['criterion'])
        : undefined;
      return {
        tag: typeof raw.tag === 'string' ? raw.tag.trim() || undefined : undefined,
        title,
        description,
        weight: weightValue,
        criterion,
        action: typeof raw.action === 'string' ? raw.action.trim() || undefined : undefined,
      } satisfies WritingFeedbackBlock;
    })
    .filter(Boolean)
    .slice(0, 5) as WritingFeedbackBlock[];
};

const sanitisePerCriterion = (value: unknown): Partial<Record<WritingCriterion, CriterionBand>> => {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const result: Partial<Record<WritingCriterion, CriterionBand>> = {};
  CRITERIA.forEach((criterion) => {
    const entry = record[criterion];
    if (entry && typeof entry === 'object') {
      const raw = entry as Record<string, unknown>;
      const band = typeof raw.band === 'number' ? raw.band : Number(raw.band);
      const feedback = typeof raw.feedback === 'string' ? raw.feedback.trim() : undefined;
      result[criterion] = {
        band: Number.isFinite(band) ? (band as number) : undefined,
        feedback,
      };
    }
  });
  return result;
};

const extractJson = (content: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const slice = content.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
};

type EvaluateEssayInput = {
  essay: string;
  task: WritingTaskType;
  wordTarget?: number | null;
  durationSeconds?: number | null;
  prompt?: {
    title?: string | null;
    promptText?: string | null;
    module?: string | null;
    difficulty?: string | null;
  };
};

type EvaluateEssayResult = {
  score: WritingScorePayload;
  extras: {
    band9Rewrite?: string | null;
    errors: WritingError[];
    blocks: WritingFeedbackBlock[];
  };
  source: 'ai' | 'baseline';
};

const buildSystemPrompt = () =>
  'You are an IELTS Writing examiner. Produce constructive feedback that mirrors official band descriptors. Respond strictly in JSON.';

const buildUserPrompt = (input: EvaluateEssayInput) => {
  const lines: string[] = [];
  lines.push(
    `Evaluate the following ${input.task === 'task1' ? 'Task 1 visual/letter report' : 'Task 2 essay'} response.`,
  );
  if (input.prompt?.title) {
    lines.push(`Prompt title: ${input.prompt.title}`);
  }
  if (input.prompt?.promptText) {
    lines.push(`Prompt detail: ${input.prompt.promptText}`);
  }
  if (input.wordTarget) {
    lines.push(`Recommended word count: ${input.wordTarget}.`);
  }
  if (input.durationSeconds) {
    lines.push(`Student used approximately ${Math.round(input.durationSeconds / 60)} minutes.`);
  }
  lines.push(
    [
      'Return JSON shaped as:',
      '{',
      '  "overallBand": number,',
      '  "bandScores": {',
      '    "task_response": number,',
      '    "coherence_and_cohesion": number,',
      '    "lexical_resource": number,',
      '    "grammatical_range": number',
      '  },',
      '  "feedback": {',
      '    "summary": string,',
      '    "strengths": string[],',
      '    "improvements": string[],',
      '    "perCriterion": {',
      '      "task_response": { "band": number, "feedback": string },',
      '      "coherence_and_cohesion": { "band": number, "feedback": string },',
      '      "lexical_resource": { "band": number, "feedback": string },',
      '      "grammatical_range": { "band": number, "feedback": string }',
      '    },',
      '    "band9Rewrite": string?,',
      '    "errors": Array<{ "type": "grammar"|"lexical"|"coherence"|"task"|"general", "excerpt": string, "suggestion"?: string, "severity"?: "low"|"medium"|"high" }>,',
      '    "blocks": Array<{ "tag"?: string, "title": string, "description": string, "weight"?: number, "criterion"?: "overall"|"task_response"|"coherence_and_cohesion"|"lexical_resource"|"grammatical_range" }>',
      '  }',
      '}.',
      'Use IELTS half-band increments (e.g. 6.5).',
    ].join('\n'),
  );
  lines.push('Student essay:\n"""\n' + input.essay.trim() + '\n"""');
  return lines.join('\n\n');
};

export async function evaluateEssayWithAi(input: EvaluateEssayInput): Promise<EvaluateEssayResult> {
  const baseline = scoreEssay({
    essay: input.essay,
    task: input.task,
    wordTarget: input.wordTarget ?? undefined,
    durationSeconds: input.durationSeconds ?? undefined,
  });

  if (!input.essay.trim()) {
    return {
      score: baseline,
      extras: {
        band9Rewrite: baseline.feedback.band9Rewrite ?? undefined,
        errors: baseline.feedback.errors ?? [],
        blocks: baseline.feedback.blocks ?? [],
      },
      source: 'baseline',
    };
  }

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(content);
    if (!parsed) {
      throw new Error('AI response missing JSON payload');
    }

    const validated = AiResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error('AI response invalid: ' + validated.error.message);
    }

    const data = validated.data;

    const bands = {
      task_response: clampBand(data.bandScores.task_response, baseline.bandScores.task_response),
      coherence_and_cohesion: clampBand(
        data.bandScores.coherence_and_cohesion,
        baseline.bandScores.coherence_and_cohesion,
      ),
      lexical_resource: clampBand(data.bandScores.lexical_resource, baseline.bandScores.lexical_resource),
      grammatical_range: clampBand(
        data.bandScores.grammatical_range,
        baseline.bandScores.grammatical_range,
      ),
    } as Record<WritingCriterion, number>;

    const perCriterionRaw = sanitisePerCriterion(data.feedback?.perCriterion);

    const perCriterion = CRITERIA.reduce((acc, criterion) => {
      const entry = perCriterionRaw[criterion];
      const fallbackFeedback = baseline.feedback.perCriterion[criterion]?.feedback ?? '';
      acc[criterion] = {
        band: clampBand(entry?.band, bands[criterion]),
        feedback: entry?.feedback && entry.feedback.length > 0 ? entry.feedback : fallbackFeedback,
      };
      return acc;
    }, {} as WritingScorePayload['feedback']['perCriterion']);

    const summary = data.feedback?.summary && data.feedback.summary.trim().length > 0
      ? data.feedback.summary.trim()
      : baseline.feedback.summary;

    const strengths = ensureStringArray(data.feedback?.strengths, baseline.feedback.strengths);
    const improvements = ensureStringArray(data.feedback?.improvements, baseline.feedback.improvements);

    const band9Rewrite = data.feedback?.band9Rewrite?.trim() || undefined;
    const errors = sanitiseErrors(data.feedback?.errors);
    const blocks = sanitiseBlocks(data.feedback?.blocks);

    const score: WritingScorePayload = {
      version: `ai-${AI_PROVIDER}-v1`,
      overallBand: clampBand(data.overallBand, baseline.overallBand),
      bandScores: {
        ...bands,
        overall: clampBand(data.overallBand, baseline.overallBand),
      },
      feedback: {
        summary,
        strengths,
        improvements,
        perCriterion,
        band9Rewrite,
        errors,
        blocks,
      },
      wordCount: baseline.wordCount,
      durationSeconds: input.durationSeconds ?? baseline.durationSeconds,
      tokensUsed: completion.usage?.total_tokens ?? undefined,
    };

    return {
      score,
      extras: {
        band9Rewrite: band9Rewrite ?? null,
        errors,
        blocks,
      },
      source: 'ai',
    };
  } catch (error) {
    console.error('[writing] AI evaluation failed – falling back to baseline', error);
    return {
      score: baseline,
      extras: {
        band9Rewrite: baseline.feedback.band9Rewrite ?? undefined,
        errors: baseline.feedback.errors ?? [],
        blocks: baseline.feedback.blocks ?? [],
      },
      source: 'baseline',
    };
  }
}

