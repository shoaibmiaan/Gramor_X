// lib/spaced-repetition.ts

export type Drill = {
  id: string;
  dueAt: Date | string;
  reps?: number;
  kind?: 'vocab' | 'skill';
};

export function isDue(d: Drill, now: Date = new Date()): boolean {
  return new Date(d.dueAt).getTime() <= now.getTime();
}

export function scheduleReview(reps: number): number {
  // Simple spaced intervals (days). Tune later.
  const table = [0, 1, 3, 7, 14, 30, 60, 120];
  const idx = Math.max(0, Math.min(reps, table.length - 1));
  return table[idx];
}

export function scheduleDrill(d: Drill, days: number): Drill {
  const next = new Date();
  next.setDate(next.getDate() + Math.max(0, days));
  return { ...d, dueAt: next, reps: (d.reps ?? 0) + 1 };
}

export function vocabIntervalDaysForRepetitions(reps: number): number {
  return scheduleReview(reps);
}

export function isVocabMastered(reps: number): boolean {
  return reps >= 5;
}
