// lib/validation/writing.v2.ts
// Zod schemas for the phase 2 writing APIs.

import { z } from 'zod';

import { writingTaskTypeSchema } from './writing';

export const writingScoreV2RequestSchema = z.object({
  attemptId: z.string().uuid().optional(),
  examAttemptId: z.string().uuid().optional(),
  promptId: z.string().optional(),
  task: writingTaskTypeSchema,
  essay: z.string().min(20, 'Essay must contain at least 20 characters'),
  durationSeconds: z.number().nonnegative().optional(),
  wordTarget: z.number().positive().optional(),
});

export const writingErrorSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['grammar', 'lexical', 'coherence', 'task', 'general']).default('general'),
  message: z.string().optional(),
  excerpt: z.string(),
  suggestion: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  replacements: z.array(z.string()).optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
});

export const writingFeedbackBlockSchema = z.object({
  tag: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().min(0).max(1).optional(),
  criterion: z.enum(['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range', 'overall']).optional(),
  action: z.string().optional(),
});

export const writingScoreV2ResponseSchema = z.object({
  ok: z.boolean(),
  result: z.object({
    version: z.string(),
    overallBand: z.number(),
    bandScores: z.record(z.string(), z.number()),
    feedback: z.object({
      summary: z.string(),
      strengths: z.array(z.string()),
      improvements: z.array(z.string()),
      perCriterion: z.record(z.string(), z.object({ band: z.number(), feedback: z.string() })),
      band9Rewrite: z.string().optional(),
      errors: z.array(writingErrorSchema).optional(),
      blocks: z.array(writingFeedbackBlockSchema).optional(),
    }),
    wordCount: z.number().nonnegative(),
    durationSeconds: z.number().nonnegative().optional(),
    tokensUsed: z.number().nonnegative().optional(),
  }),
});

export const writingProgressResponseSchema = z.object({
  ok: z.boolean(),
  points: z.array(
    z.object({
      attemptId: z.string(),
      createdAt: z.string(),
      overallBand: z.number(),
      bandScores: z.record(z.string(), z.number()),
    }),
  ),
  deltas: z.array(
    z.object({
      criterion: z.string(),
      current: z.number(),
      previous: z.number().nullable(),
      delta: z.number(),
    }),
  ),
});

export const awardWritingXpSchema = z.object({
  attemptId: z.string().uuid(),
});

export type WritingScoreV2Request = z.infer<typeof writingScoreV2RequestSchema>;
export type WritingScoreV2Response = z.infer<typeof writingScoreV2ResponseSchema>;
export type WritingProgressResponse = z.infer<typeof writingProgressResponseSchema>;
export type AwardWritingXpRequest = z.infer<typeof awardWritingXpSchema>;
