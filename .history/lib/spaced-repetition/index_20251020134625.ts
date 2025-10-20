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
