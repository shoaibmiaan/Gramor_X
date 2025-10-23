// types/analytics.ts
// Analytics layer primitives shared across dashboards and API responses.

import type { WritingCriterion } from './writing';

export interface WritingAttemptSummary {
  attemptId: string;
  createdAt: string;
  overallBand: number;
  durationSeconds?: number | null;
  goalBand?: number | null;
}

export interface WritingSummary {
  averageBand: number;
  averageDurationSeconds: number;
  totalAttempts: number;
  totalWords: number;
  attempts: WritingAttemptSummary[];
}

export interface WritingProgressPoint {
  attemptId: string;
  createdAt: string;
  overallBand: number;
  bandScores: Record<WritingCriterion, number>;
}

export interface CriterionDelta {
  criterion: WritingCriterion | 'overall';
  current: number;
  previous: number | null;
  delta: number;
}

export interface WritingOverview {
  totalAttempts: number;
  totalWords: number;
  averageOverallBand: number;
  averageTaskResponseBand: number;
  averageCoherenceBand: number;
  averageLexicalBand: number;
  averageGrammarBand: number;
  averageWordCount: number | null;
  averageDurationSeconds: number | null;
  lastAttemptAt: string | null;
}

export interface WeeklySeriesPoint {
  weekStart: string;
  label: string;
  attempts: number;
  averageBand: number;
  averageWordCount: number;
}

export interface WeeklySeries {
  points: WeeklySeriesPoint[];
  totalAttempts: number;
}
