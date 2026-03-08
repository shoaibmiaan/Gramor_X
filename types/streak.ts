export type StreakCalendarEntry = {
  date: string;
  active: boolean;
};

export type StreakTaskKey = 'writing' | 'speaking' | 'mock' | 'grammar_ai' | 'reading';

export type StreakTaskStatus = {
  key: StreakTaskKey;
  label: string;
  href: string;
  completed: boolean;
};

export type StreakActivityEntry = {
  date: string;
  tasks: StreakTaskKey[];
};

export type StreakSummary = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  next_restart_date: string | null;
  shields: number;
  today_completed: boolean;
  heatmap: StreakCalendarEntry[];
  today_tasks: StreakTaskStatus[];
  activity_history: StreakActivityEntry[];
};

export type StreakMutationAction = 'claim' | 'schedule' | 'use';
