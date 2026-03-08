import { computeDailyStreak } from '@/lib/streak';

export type DailyStreak = {
  currentStreak: number;
  longestStreak: number;
};

export function computeDailyStreakFromReading(entries: { date: string | Date }[]): DailyStreak {
  return computeDailyStreak(entries);
}

// Backward compatible export
export const computeDailyStreakLegacy = computeDailyStreakFromReading;
export { computeDailyStreakFromReading as computeDailyStreak };
