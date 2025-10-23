export type MockReadingAttempt = {
  id: string;
  paperId: string;
  band: number;
  correct: number;
  total: number;
  percentage: number;
  durationSec: number;
  submittedAt: string | null;
  answers: Record<string, string>;
};

export type MockReadingXpSummary = {
  awarded: number;
  total: number;
  required: number;
  percent: number;
  targetBand: number;
};

export type MockReadingStreak = {
  current: number;
};

export type MockReadingResultResponse =
  | {
      ok: true;
      attempt: MockReadingAttempt;
      xp: MockReadingXpSummary;
      streak: MockReadingStreak;
    }
  | { ok: false; error: string };
