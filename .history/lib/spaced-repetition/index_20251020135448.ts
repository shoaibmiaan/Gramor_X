// lib/spaced-repetition/index.ts

// ---------- Types ----------
export type ReviewItem = {
  id: string;
  user_id: string;
  item_type: 'listening' | 'reading' | 'writing' | 'speaking' | 'vocab';
  last_reviewed_at: string | null;
  easiness: number;
  interval_days: number;
  due_at: string;
};

// ---------- Core scheduling math (SM-2 style light) ----------
export function nextInterval(
  easiness: number,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  prevDays: number
): { nextDays: number; nextEasiness: number } {
  const e = Math.max(
    1.3,
    easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  const next = quality < 3 ? 1 : (prevDays <= 1 ? 1 : Math.round(prevDays * e));
  return { nextDays: next, nextEasiness: e };
}

// ---------- Helpers expected by /api/review/grade.ts ----------

// Deterministic “good-enough” vocab schedule by successful repetitions.
// 0→1d, 1→2d, 2→4d, 3→7d, 4→15d, 5→30d, 6→60d, 7+→120d
export function vocabIntervalDaysForRepetitions(repetitions: number): number {
  const r = Math.max(0, Math.floor(repetitions));
  const schedule = [1, 2, 4, 7, 15, 30, 60, 120];
  return r >= schedule.length ? schedule[schedule.length - 1] : schedule[r];
}

// Consider a vocab item “mastered” if it reached a long interval or many reps.
// Safe defaults so we don’t over-promote: 60+ days OR 8+ successful reps.
export function isVocabMastered(
  repetitions: number,
  easiness?: number,
  currentIntervalDays?: number
): boolean {
  const interval = currentIntervalDays ?? vocabIntervalDaysForRepetitions(repetitions);
  return repetitions >= 8 || interval >= 60;
}

// ---------- Scheduling facade used by /api/review/grade ----------
export type ScheduleReviewInput = {
  easiness: number;                 // previous E-Factor (>=1.3)
  interval_days: number;            // previous interval in days (>=1)
  quality: 0 | 1 | 2 | 3 | 4 | 5;   // SM-2 quality score for this review
  repetitions?: number;             // successful reps so far (for vocab mastery)
  nowISO?: string;                  // testability override
};

export type ScheduleReviewResult = {
  next_interval_days: number;
  next_easiness: number;
  next_due_at: string;              // ISO timestamp
  mastered: boolean;                // conservative mastery flag
};

export function scheduleReview(input: ScheduleReviewInput): ScheduleReviewResult {
  const prevDays = Math.max(1, Math.floor(input.interval_days || 1));
  const prevEase = Number.isFinite(input.easiness) ? input.easiness : 2.5;

  const { nextDays, nextEasiness } = nextInterval(prevEase, input.quality, prevDays);

  const reps =
    Math.max(0, Math.floor(input.repetitions ?? 0)) + (input.quality >= 3 ? 1 : 0);
  const mastered = isVocabMastered(reps, nextEasiness, nextDays);

  const base = input.nowISO ? new Date(input.nowISO) : new Date();
  const due = new Date(base);
  due.setDate(due.getDate() + nextDays);

  return {
    next_interval_days: nextDays,
    next_easiness: Number(nextEasiness.toFixed(4)),
    next_due_at: due.toISOString(),
    mastered,
  };
}
