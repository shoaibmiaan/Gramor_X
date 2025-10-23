// types/analytics.ts
// Analytics layer primitives shared across dashboards and API responses.

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
