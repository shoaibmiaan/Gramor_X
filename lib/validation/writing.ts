// lib/validation/writing.ts
// Zod schemas shared across the writing module APIs.

import { z } from 'zod';

export const writingTaskTypeSchema = z.union([z.literal('task1'), z.literal('task2')]);

export const writingScoreRequestSchema = z.object({
  attemptId: z.string().uuid().optional(),
  examAttemptId: z.string().uuid().optional(),
  promptId: z.string().optional(),
  task: writingTaskTypeSchema,
  essay: z.string().min(20, 'Essay must contain at least 20 characters'),
  durationSeconds: z.number().nonnegative().optional(),
  wordTarget: z.number().positive().optional(),
});

export const writingExplainRequestSchema = z.object({
  task: writingTaskTypeSchema,
  essay: z.string().min(20),
  criterion: z.union([
    z.literal('task_response'),
    z.literal('coherence_and_cohesion'),
    z.literal('lexical_resource'),
    z.literal('grammatical_range'),
  ]),
  wordTarget: z.number().positive().optional(),
});

export const writingStartSchema = z.object({
  promptId: z.string().min(1),
  mockId: z.string().min(1).optional(),
  goalBand: z.number().min(0).max(9).optional(),
});

export const writingDraftSchema = z.object({
  attemptId: z.string().uuid(),
  tasks: z
    .record(
      writingTaskTypeSchema,
      z
        .object({
          content: z.string(),
          wordCount: z.number().nonnegative(),
        })
        .optional(),
    )
    .optional(),
  activeTask: writingTaskTypeSchema.optional(),
  elapsedSeconds: z.number().nonnegative().optional(),
  event: z.enum(['focus', 'blur', 'typing']).optional(),
  payload: z.record(z.any()).optional(),
});

export const writingSubmitSchema = z.object({
  attemptId: z.string().uuid(),
  promptId: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  tasks: z.object({
    task1: z
      .object({
        essay: z.string().min(10),
        promptId: z.string().optional(),
      })
      .optional(),
    task2: z
      .object({
        essay: z.string().min(10),
        promptId: z.string().optional(),
      })
      .optional(),
  }),
});

export type WritingScoreRequest = z.infer<typeof writingScoreRequestSchema>;
export type WritingExplainRequest = z.infer<typeof writingExplainRequestSchema>;
export type WritingStartRequest = z.infer<typeof writingStartSchema>;
export type WritingDraftRequest = z.infer<typeof writingDraftSchema>;
export type WritingSubmitRequest = z.infer<typeof writingSubmitSchema>;
