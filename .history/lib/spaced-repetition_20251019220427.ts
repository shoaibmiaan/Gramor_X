    // lib/spaced-repetition.ts

export type VocabItem = {
  id: string;
  strength: number;           // 0..1 “how strong this word is”
  correctStreak: number;       // consecutive correct reviews
  lastReviewedAt?: string | Date;
};

// Simple SM-2-like day intervals by streak step (tunable)
const INTERVAL_TABLE_DAYS = [0, 1, 2, 4, 7, 15, 30, 60, 120];

export function vocabIntervalDaysForRepetitions(streak: number): number {
  const i = Math.max(0, Math.min(streak, INTERVAL_TABLE_DAYS.length - 1));
  return INTERVAL_TABLE_DAYS[i];
}

// Consider a word “mastered” when strong enough OR long streak
export function isVocabMastered(strength: number, streak: number): boolean {
  return strength >= 0.95 || streak >= 8;
}

// (Optional) default export if some files do `import SR from ...`
const SR = { vocabIntervalDaysForRepetitions, isVocabMastered };
export default SR;
