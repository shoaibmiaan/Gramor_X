// Utility for computing daily study streaks in Reading.

export type DailyStreak = {
  currentStreak: number;
  longestStreak: number;
};

/**
 * computeDailyStreak takes an array of dates (strings or Date objects)
 * representing when the user completed reading attempts. It returns the
 * length of the current streak (consecutive days ending on the last
 * attempt) and the longest streak ever achieved. A streak is defined as
 * completing at least one attempt every calendar day without gaps.
 */
export function computeDailyStreak(entries: { date: string | Date }[]): DailyStreak {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }
  // Normalize all dates to yyyy-mm-dd strings and deduplicate.
  const uniqueDates = new Set(
    entries.map((entry) => {
      const d = new Date(entry.date);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0];
    }),
  );
  // Sort the dates ascending.
  const sorted = Array.from(uniqueDates).sort();
  let longest = 1;
  let current = 1;
  let prev: Date | null = null;
  sorted.forEach((ds) => {
    const d = new Date(ds);
    if (prev) {
      const diffDays = (d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        current += 1;
      } else {
        current = 1;
      }
      if (current > longest) longest = current;
    }
    prev = d;
  });
  return { currentStreak: current, longestStreak: longest };
}
