// lib/listening/analyticsTypes.ts
import type { ListeningQuestionType } from './questionTypes';

export type ListeningQuestionTypeStats = {
  questionType: ListeningQuestionType;
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  // derived on the fly
  accuracy: number; // 0–1
};

export type ListeningQuestionTypeStatsMap = Partial<
  Record<ListeningQuestionType, ListeningQuestionTypeStats>
>;
