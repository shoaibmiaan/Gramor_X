// lib/listening/analytics.ts
import type { Database } from '@/lib/database.types';
import {
  LISTENING_QUESTION_TYPE_KEYS,
  type ListeningQuestionType,
} from './questionTypes';
import {
  type ListeningQuestionTypeStats,
  computeAccuracyFromCounts,
} from './analyticsTypes';

type ListeningAttemptAnswerRow =
  Database['public']['Tables']['listening_attempt_answers']['Row'];

type ListeningQuestionRow =
  Database['public']['Tables']['listening_questions']['Row'];

export function buildQuestionTypeStats(
  questions: ListeningQuestionRow[],
  answers: ListeningAttemptAnswerRow[],
): ListeningQuestionTypeStats[] {
  const byQuestionId = new Map<string, ListeningQuestionRow>();
  for (const q of questions) {
    byQuestionId.set(String(q.id), q);
  }

  const counts = new Map<
    ListeningQuestionType,
    { totalQuestions: number; totalAttempted: number; totalCorrect: number }
  >();

  // Pre-seed all types for stable UI ordering
  for (const key of LISTENING_QUESTION_TYPE_KEYS) {
    counts.set(key, { totalQuestions: 0, totalAttempted: 0, totalCorrect: 0 });
  }

  // Count total questions per type
  for (const q of questions) {
    const qt = q.question_type as string | null;
    if (!qt || !LISTENING_QUESTION_TYPE_KEYS.includes(qt as ListeningQuestionType))
      continue;

    const bucket = counts.get(qt as ListeningQuestionType);
    if (!bucket) continue;
    bucket.totalQuestions += 1;
  }

  // Count attempts + correct
  for (const a of answers) {
    const q = byQuestionId.get(String(a.question_id));
    if (!q) continue;
    const qt = q.question_type as string | null;
    if (!qt || !LISTENING_QUESTION_TYPE_KEYS.includes(qt as ListeningQuestionType))
      continue;

    const bucket = counts.get(qt as ListeningQuestionType);
    if (!bucket) continue;

    bucket.totalAttempted += 1;
    if (a.is_correct) {
      bucket.totalCorrect += 1;
    }
  }

  const result: ListeningQuestionTypeStats[] = [];

  for (const key of LISTENING_QUESTION_TYPE_KEYS) {
    const bucket = counts.get(key)!;
    const accuracy = computeAccuracyFromCounts(
      bucket.totalCorrect,
      bucket.totalAttempted,
    );

    result.push({
      questionType: key,
      totalQuestions: bucket.totalQuestions,
      totalAttempted: bucket.totalAttempted,
      totalCorrect: bucket.totalCorrect,
      accuracy,
    });
  }

  return result;
}
