import { z } from 'zod';

export const WritingTaskType = z.enum(['task1', 'task2']);
export type WritingTaskType = z.infer<typeof WritingTaskType>;

export const UUID = z.string().uuid();

export const AttemptStartBody = z.object({
  promptId: UUID,
  taskType: WritingTaskType,
});
export type AttemptStartBody = z.infer<typeof AttemptStartBody>;

export const SaveDraftBody = z.object({
  attemptId: UUID,
  draftText: z.string().max(20000),
  wordCount: z.number().int().nonnegative(),
  timeSpentMs: z.number().int().nonnegative(),
});
export type SaveDraftBody = z.infer<typeof SaveDraftBody>;

export const SubmitBody = z.object({
  attemptId: UUID,
});
export type SubmitBody = z.infer<typeof SubmitBody>;

export const RedraftBody = z.object({
  sourceAttemptId: UUID,
});
export type RedraftBody = z.infer<typeof RedraftBody>;

export const DrillCompleteBody = z.object({
  attemptId: UUID.optional(),
  tags: z.array(z.string()).min(1).max(8),
});
export type DrillCompleteBody = z.infer<typeof DrillCompleteBody>;

export const ReviewSubmitBody = z.object({
  attemptId: UUID,
  role: z.enum(['peer', 'teacher']),
  scores: z
    .record(z.string(), z.number().min(0).max(9))
    .optional(),
  comments: z
    .array(
      z.object({
        path: z.string(),
        note: z.string().max(500),
      }),
    )
    .optional(),
  audioUrl: z.string().url().optional(),
});
export type ReviewSubmitBody = z.infer<typeof ReviewSubmitBody>;

export const RehearsalSimilarBody = z.object({
  promptId: UUID,
});
export type RehearsalSimilarBody = z.infer<typeof RehearsalSimilarBody>;

export const ScoresJson = z.object({
  overall: z.number().min(0).max(9),
  TR: z.number().min(0).max(9),
  CC: z.number().min(0).max(9),
  LR: z.number().min(0).max(9),
  GRA: z.number().min(0).max(9),
});
export type ScoresJson = z.infer<typeof ScoresJson>;

export const FeedbackJson = z.object({
  highlights: z.array(z.string()).max(10).optional(),
  fixes: z
    .array(
      z.object({
        title: z.string(),
        why: z.string(),
        example: z.string().optional(),
      }),
    )
    .max(10)
    .optional(),
});
export type FeedbackJson = z.infer<typeof FeedbackJson>;

export const CrossEvidenceBody = z.object({
  promptId: UUID,
  topic: z.string().max(200).optional(),
});
export type CrossEvidenceBody = z.infer<typeof CrossEvidenceBody>;

export const BandReportBody = z.object({
  rangeDays: z.number().int().min(3).max(30).optional(),
  channels: z.array(z.enum(['email', 'whatsapp', 'in_app'])).optional(),
});
export type BandReportBody = z.infer<typeof BandReportBody>;

export const MicroPromptRequestBody = z.object({
  channels: z.array(z.enum(['in_app', 'whatsapp', 'email'])).optional(),
  source: z.enum(['dashboard', 'manual', 'cron']).default('dashboard'),
});
export type MicroPromptRequestBody = z.infer<typeof MicroPromptRequestBody>;
