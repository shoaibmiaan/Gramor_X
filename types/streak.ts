export type StreakSummary = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  next_restart_date: string | null;
  shields: number;
};

export type StreakMutationAction = 'claim' | 'schedule' | 'use';
