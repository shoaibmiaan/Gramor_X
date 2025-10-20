export type VocabItem = {
  id: string;
  strength: number;        // 0..1
  correctStreak: number;   // consecutive correct reviews
  lastReviewedAt?: string | Date;
};

// Tunable day-intervals by streak index
const INTERVAL_TABLE_DAYS = [0, 1, 2, 4, 7, 15, 30, 60, 120];

export function vocabIntervalDaysForRepetitions(streak: number): number {
  const i = Math.max(0, Math.min(streak, INTERVAL_TABLE_DAYS.length - 1));
  return INTERVAL_TABLE_DAYS[i];
}

export function isVocabMastered(strength: number, streak: number): boolean {
  return strength >= 0.95 || streak >= 8;
}

// Optional default (safe if any legacy code imports default)
const SR = { vocabIntervalDaysForRepetitions, isVocabMastered };
export default SR;
