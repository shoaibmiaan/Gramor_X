export type StreakCalendarEntry = {
  date: string;
  active: boolean;
};

export type StreakSummary = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  next_restart_date: string | null;
  shields: number;
  today_completed: boolean;
  heatmap: StreakCalendarEntry[];
};

export type StreakMutationAction = 'claim' | 'schedule' | 'use';
