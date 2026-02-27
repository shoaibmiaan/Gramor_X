export interface SkillScore {
  name: string;
  current: number;
  target: number;
}

export interface DayTask {
  id: string;
  title: string;
  description: string;
  duration?: number; // minutes
  completed?: boolean;
  icon?: string;
  type?: 'video' | 'quiz' | 'practice' | 'review';
  contentId?: string; // reference to actual content
}

export interface Week {
  id: string;
  number: number;
  focus?: string;
  dateRange?: string; // e.g., "Mar 10 – Mar 16"
  isCurrent?: boolean;
  tasks?: DayTask[]; // tasks grouped by day or flat list
  days?: {
    day: string; // e.g., "Monday"
    tasks: DayTask[];
  }[];
}

export interface AIRecommendation {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: string;
}

export interface StudyPlan {
  id?: string;
  userId?: string;
  targetBand: number;
  examDate: string | null;
  baselineScores: {
    reading: number | null;
    writing: number | null;
    listening: number | null;
    speaking: number | null;
  };
  learningStyle: 'video' | 'tips' | 'practice' | 'flashcards';
  totalWeeks: number;
  daysPerWeek: number;
  weeks: Week[];
  firstTaskId?: string;
  recommendations?: AIRecommendation[];
  generatedAt?: string;
  // Optional helper methods
  getTodayTasks?: () => DayTask[];
}