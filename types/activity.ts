export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type KnownActivityType =
  | 'login'
  | 'logout'
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'attempt_submitted'
  | 'writing_submitted'
  | 'speaking_completed'
  | 'listening_completed'
  | 'reading_completed'
  | 'profile_updated'
  | 'course_enrolled'
  | 'lesson_completed'
  | 'streak_updated'
  | 'achievement_earned';

export type ActivityType = KnownActivityType | (string & {});

export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  writingAttempts: number;
  speakingAttempts: number;
  listeningAttempts: number;
  readingAttempts: number;
  streakDays: number;
  lastActive: string;
}

export interface TaskUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  module?: string;
  task_type?: string;
  reference_id?: string;
  reference_table?: string;
  creator: TaskUser;
  assignee: TaskUser;
  comments_count: number;
}

export type GenericActivityMetadata = Record<string, unknown>;

export interface TaskActivityMetadata extends GenericActivityMetadata {
  task_id?: string;
  new_status?: TaskStatus;
}

export interface AttemptActivityMetadata extends GenericActivityMetadata {
  module?: 'writing' | 'speaking' | 'listening' | 'reading';
  score?: number;
}

interface BaseRecentActivity {
  id: string;
  description: string;
  created_at: string;
  related_table?: string;
  related_id?: string;
}

export type RecentActivity =
  | (BaseRecentActivity & {
      activity_type: 'task_created' | 'task_completed' | 'task_updated';
      metadata: TaskActivityMetadata | null;
    })
  | (BaseRecentActivity & {
      activity_type: 'writing_submitted' | 'speaking_completed' | 'listening_completed' | 'reading_completed' | 'attempt_submitted';
      metadata: AttemptActivityMetadata | null;
    })
  | (BaseRecentActivity & {
      activity_type: ActivityType;
      metadata: GenericActivityMetadata | null;
    });

export type ActivityDateRangeFilter = 'today' | '7d' | '30d' | '90d' | 'all';
export type ActivityTypeCategory = 'task' | 'writing' | 'speaking' | 'listening' | 'reading' | 'system';
export type ActivityTypeFilter = 'all' | ActivityTypeCategory | KnownActivityType;
export type TaskStatusFilter = 'all' | TaskStatus;

export interface ActivityFilters {
  dateRange: ActivityDateRangeFilter;
  activityType: ActivityTypeFilter;
  taskStatus: TaskStatusFilter;
}
