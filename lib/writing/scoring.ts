// lib/writing/scoring.ts
// Lightweight heuristics that transform an essay into IELTS-style band scores.
// The goal of the v1 scorer is to provide deterministic scaffolding that the
// future AI integration can override without changing the rest of the module.

import type {
  WritingCriterion,
  WritingFeedback,
  WritingScorePayload,
  WritingTaskType,
} from '@/types/writing';

const clamp = (value: number, lower: number, upper: number) => {
  if (Number.isNaN(value)) return lower;
  if (value < lower) return lower;
  if (value > upper) return upper;
  return value;
};

const SENTENCE_REGEX = /[^.!?]+[.!?]?/g;
const WORD_REGEX = /[\p{L}\p{N}'-]+/gu;
const PARAGRAPH_REGEX = /\n{2,}/g;

export const WRITING_SCORING_VERSION = 'baseline-v1';

export type ScoreContext = {
  essay: string;
  task: WritingTaskType;
  wordTarget?: number | null;
  durationSeconds?: number | null;
};

export type CriterionScore = {
  band: number;
  rationale: string;
};

const CRITERIA: WritingCriterion[] = [
  'task_response',
  'coherence_and_cohesion',
  'lexical_resource',
  'grammatical_range',
];

const MIN_BAND = 3.0;
const MAX_BAND = 9.0;

const paragraphsCount = (essay: string) => {
  if (!essay.trim()) return 0;
  return essay.trim().split(PARAGRAPH_REGEX).filter(Boolean).length;
};

const countWords = (essay: string) => {
  if (!essay.trim()) return 0;
  const matches = essay.match(WORD_REGEX);
  return matches ? matches.length : 0;
};

const countSentences = (essay: string) => {
  if (!essay.trim()) return 0;
  const matches = essay.match(SENTENCE_REGEX);
  if (!matches) return 0;
  return matches.filter((s) => s.trim().length > 0).length;
};

const lexicalVariety = (essay: string) => {
  const matches = essay.toLowerCase().match(WORD_REGEX);
  if (!matches || matches.length === 0) return 0;
  const unique = new Set(matches.filter((word) => word.length > 2));
  return unique.size / matches.length;
};

const computeTaskResponse = (ctx: ScoreContext, totalWords: number): CriterionScore => {
  const target = ctx.wordTarget ?? (ctx.task === 'task1' ? 150 : 250);
  const ratio = target === 0 ? 1 : totalWords / target;
  const coverage = clamp(ratio, 0, 1.2);
  let band = 5.0 + coverage * 4;
  if (coverage < 0.75) band -= 1.5;
  if (coverage < 0.5) band -= 2;
  band = clamp(band, MIN_BAND, MAX_BAND);
  const rationale = coverage >= 1
    ? 'Meets recommended word count and likely covers main points.'
    : coverage >= 0.75
      ? 'Slightly below recommended word count. Elaborating key ideas would strengthen Task Response.'
      : 'Significantly below recommended word count. Add more detail to fully address the prompt.';
  return { band: Number(band.toFixed(1)), rationale };
};

const computeCoherence = (essay: string, paragraphs: number): CriterionScore => {
  const hasIntro = paragraphs >= 2;
  const hasClearParagraphs = paragraphs >= 3;
  let band = 5.5;
  if (hasIntro) band += 1;
  if (hasClearParagraphs) band += 1.2;
  if (essay.includes('Firstly') || essay.includes('In conclusion')) band += 0.3;
  band = clamp(band, MIN_BAND, MAX_BAND);
  const rationale = hasClearParagraphs
    ? 'Paragraphing indicates clear progression of ideas.'
    : hasIntro
      ? 'Consider adding separate body paragraphs to improve cohesion.'
      : 'Introduce distinct paragraphs to clarify structure.';
  return { band: Number(band.toFixed(1)), rationale };
};

const computeLexical = (essay: string, variety: number, totalWords: number): CriterionScore => {
  let band = 5 + variety * 8;
  if (totalWords < 120) band -= 1.2;
  band = clamp(band, MIN_BAND, MAX_BAND);
  const rationale = variety > 0.4
    ? 'Shows a solid range of vocabulary.'
    : 'Repetition detected. Introduce synonyms and topic-specific vocabulary.';
  return { band: Number(band.toFixed(1)), rationale };
};

const computeGrammar = (essay: string, sentences: number): CriterionScore => {
  const commas = (essay.match(/,/g) || []).length;
  const complexSentenceRatio = sentences === 0 ? 0 : clamp(commas / sentences, 0, 1);
  let band = 5.2 + complexSentenceRatio * 3.5;
  if (sentences < 6) band -= 0.8;
  band = clamp(band, MIN_BAND, MAX_BAND);
  const rationale = complexSentenceRatio > 0.4
    ? 'Complex sentence structures identified. Maintain grammatical accuracy.'
    : 'Try varying sentence length and structure to showcase grammatical range.';
  return { band: Number(band.toFixed(1)), rationale };
};

const buildFeedback = (scores: Record<WritingCriterion, CriterionScore>): WritingFeedback => {
  const strengths: string[] = [];
  const improvements: string[] = [];

  CRITERIA.forEach((criterion) => {
    const { band, rationale } = scores[criterion];
    if (band >= 7) {
      strengths.push(rationale);
    } else if (band <= 5.5) {
      improvements.push(rationale);
    }
  });

  if (strengths.length === 0) {
    strengths.push('Solid foundation. Keep practising to further refine your essay.');
  }
  if (improvements.length === 0) {
    improvements.push('Focus on polishing examples and proofreading for minor slips.');
  }

  return {
    summary: 'Automated baseline feedback. Human tutors will be able to review in later phases.',
    strengths,
    improvements,
    perCriterion: CRITERIA.reduce((acc, criterion) => {
      acc[criterion] = {
        band: scores[criterion].band,
        feedback: scores[criterion].rationale,
      };
      return acc;
    }, {} as WritingFeedback['perCriterion']),
  };
};

export const scoreEssay = (ctx: ScoreContext): WritingScorePayload => {
  const totalWords = countWords(ctx.essay);
  const paragraphs = paragraphsCount(ctx.essay);
  const sentences = countSentences(ctx.essay);
  const variety = lexicalVariety(ctx.essay);

  const criterionScores: Record<WritingCriterion, CriterionScore> = {
    task_response: computeTaskResponse(ctx, totalWords),
    coherence_and_cohesion: computeCoherence(ctx.essay, paragraphs),
    lexical_resource: computeLexical(ctx.essay, variety, totalWords),
    grammatical_range: computeGrammar(ctx.essay, sentences),
  };

  const totalBand =
    criterionScores.task_response.band +
    criterionScores.coherence_and_cohesion.band +
    criterionScores.lexical_resource.band +
    criterionScores.grammatical_range.band;
  const overallBand = Number((totalBand / CRITERIA.length).toFixed(1));

  return {
    version: WRITING_SCORING_VERSION,
    overallBand,
    bandScores: {
      task_response: criterionScores.task_response.band,
      coherence_and_cohesion: criterionScores.coherence_and_cohesion.band,
      lexical_resource: criterionScores.lexical_resource.band,
      grammatical_range: criterionScores.grammatical_range.band,
    },
    feedback: buildFeedback(criterionScores),
    wordCount: totalWords,
    durationSeconds: ctx.durationSeconds ?? undefined,
    tokensUsed: 0,
  };
};

export const explainCriterion = (
  criterion: WritingCriterion,
  ctx: ScoreContext,
): { band: number; explanation: string } => {
  const scores = scoreEssay(ctx);
  const band = scores.bandScores[criterion];
  const explanation = scores.feedback.perCriterion[criterion]?.feedback ?? '';
  return { band, explanation };
};

export const normalizeScorePayload = (payload: WritingScorePayload) => {
  return {
    overallBand: payload.overallBand,
    bandScores: payload.bandScores,
    feedback: payload.feedback,
    wordCount: payload.wordCount,
    durationSeconds: payload.durationSeconds ?? undefined,
    version: payload.version,
    tokensUsed: payload.tokensUsed ?? undefined,
  };
};
