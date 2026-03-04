// types/dashboard.ts
import type { SubscriptionTier } from '@/lib/navigation/types';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  goal_band?: number | null;
  target_exam_date?: string | null;
  study_rhythm?: string;
}

export interface Streak {
  current: number;
  longest: number;
  last_activity_date: string | null;
  next_restart_date: string | null;
  shields: number;
}

export interface TodayTask {
  id: string;
  type: 'learning' | 'practice' | 'mock';
  title: string;
  description: string;
  estimated_minutes: number;
  href: string;
  order: number;
}

export interface SkillProgress {
  id: string;
  name: string;
  current_score_label: string;
  trend_label: string;
  trend_direction: 'up' | 'down' | 'flat';
  detail: string;
  href: string;
}

export interface MockSummary {
  total_attempts: number;
  best_band: number | null;
  last_band: number | null;
  last_attempt_at: string | null;
  next_recommended_mock_href: string;
}

export interface GamificationSummary {
  streak_days: number;
  xp_this_week: number;
  total_xp: number;
  leaderboard_rank: number | null;
  leaderboard_percentile: number | null;
  leaderboard_href: string;
}

export interface AIInsight {
  id: string;
  title: string;
  body: string;
  href?: string;
}

export interface ChallengeLeaderboardEntry {
  userId: string;
  fullName: string;
  completedTasks: number;
  xp?: number;
  rank: number;
  snapshotDate?: string;
}

export interface ChallengeProgress {
  [date: string]: 'pending' | 'done' | 'skipped';
}

export interface ChallengeDefinition {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  goal: number;
  xpReward: number;
  progress?: ChallengeProgressItem;
}

export interface ChallengeProgressItem {
  challengeId: string;
  progressCount: number;
  totalMastered: number;
  target: number;
  lastIncrementedAt: string | null;
  resetsAt: string | null;
}

export interface SavedItem {
  id?: string;
  resource_id: string;
  type: string | null;
  category: string | null;
  created_at: string;
}

export interface DashboardData {
  profile: Profile | null;
  streak: Streak | null;
  tasks: TodayTask[];
  skills: SkillProgress[];
  mockSummary: MockSummary | null;
  gamification: GamificationSummary | null;
  insights: AIInsight[];
  challenges: ChallengeDefinition[];
  savedItems: SavedItem[];
}