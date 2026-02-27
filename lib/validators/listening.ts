// lib/validators/listening.ts
import { z } from 'zod';

export const LevelZ = z.enum(['beginner', 'intermediate', 'advanced']);
export const AccentZ = z.enum(['uk', 'us', 'aus', 'mix']);
export const SectionZ = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const QTypeZ   = z.enum(['mcq','map','form','matching','short','other']);

export const QuestionZ = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(), // for MCQ
  meta: z.record(z.any()).optional(),
});

export const AnswerZ = z.object({
  id: z.string().min(1),
  correct: z.union([z.string(), z.array(z.string())]),
});

export const ArticleZ = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  level: LevelZ,
  tags: z.array(z.string()),
  content_md: z.string().min(1),
  published: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MediaZ = z.object({
  id: z.string().uuid(),
  kind: z.enum(['audio','video']),
  url: z.string().url(),
  duration_secs: z.number().int().nonnegative(),
  transcript: z.string().nullable().optional(),
  accent: AccentZ,
  level: LevelZ,
  tags: z.array(z.string()),
  created_at: z.string(),
});

export const ExerciseZ = z.object({
  id: z.string().uuid(),
  media_id: z.string().uuid(),
  section: SectionZ,
  qtype: QTypeZ,
  questions: z.array(QuestionZ).min(1),
  answers: z.array(AnswerZ).min(1),
  level: LevelZ,
  tags: z.array(z.string()),
  created_at: z.string(),
});

export const AttemptZ = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  score: z.number().int().min(0).max(40),
  mistakes: z.record(z.any()).optional(),
  meta: z.record(z.any()).optional(),
  created_at: z.string(),
});

/** Common API contracts */

// grade mini/mock (request/response)
export const GradeBodyZ = z.object({
  exerciseId: z.string().uuid(),
  answers: z.array(z.union([z.string(), z.array(z.string())])).min(1),
});

export const GradeResultZ = z.object({
  score: z.number().int().min(0).max(40),
  items: z.array(z.object({
    id: z.string(),
    correct: z.boolean(),
    expected: z.union([z.string(), z.array(z.string())]),
    received: z.union([z.string(), z.array(z.string())]).nullable(),
  })),
});

// dictation
export const DictationBodyZ = z.object({
  mediaId: z.string().uuid(),
  transcriptUser: z.string().min(1),
});
export const DictationResultZ = z.object({
  errors: z.array(z.object({ word: z.string(), idx: z.number().int().nonnegative() })),
});
