// types/home.ts
// -----------------------------------------------------------------------------
// Central contract for the dynamic home experience. This module defines a
// strongly typed data shape that covers every section rendered on the logged-in
// home page. Server loaders are expected to assemble a `HomeProps` object
// during SSR, and client features should only read from these types to remain in
// sync.
// -----------------------------------------------------------------------------

import type { PlanId } from './pricing';
import type { TaskType } from './plan';

/** Stable list of areas used for analytics events. */
export type HomeArea =
  | 'hero'
  | 'modules'
  | 'coach'
  | 'vocab'
  | 'reports'
  | 'streak'
  | 'calendar'
  | 'saved'
  | 'mistakes'
  | 'upgrade'
  | 'guides';

export type HomeModuleId = 'listening' | 'reading' | 'writing' | 'speaking' | 'mock';

export interface HomeUser {
  id: string;
  email: string | null;
  fullName: string;
  firstName: string;
  avatarUrl: string | null;
  planId: PlanId;
  planName: string;
  isTrialing: boolean;
  trialEndsAtISO: string | null;
  timezone: string;
  locale: string;
  abVariant: string | null;
  roles: string[];
  isGuest: boolean;
  featureFlags: string[];
}

export interface HomeStreakSummary {
  current: number;
  best: number;
  target: number;
  timezone: string;
  lastCompletedAtISO: string | null;
}

export interface HomeModuleStat {
  id: HomeModuleId;
  label: string;
  href: string;
  progressPercent: number | null;
  trend: 'up' | 'down' | 'steady' | null;
  lastActivityISO: string | null;
  completions: number;
  locked: boolean;
  badge: string | null;
}

export interface HomeSavedSummary {
  total: number;
  lastAddedISO: string | null;
}

export interface HomeMistakeSummary {
  total: number;
  unresolved: number;
  lastReviewedISO: string | null;
}

export interface HomeStats {
  streak: HomeStreakSummary;
  modules: HomeModuleStat[];
  saved: HomeSavedSummary;
  mistakes: HomeMistakeSummary;
}

export interface HomeNextTask {
  id: string;
  type: TaskType;
  title: string;
  description: string | null;
  href: string;
  dueAtISO: string | null;
  estimatedMinutes: number | null;
  source: 'plan' | 'coach' | 'recommendation';
  available: boolean;
  locked: boolean;
}

export interface HomeWordOfDay {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
  pronunciation: string | null;
  audioUrl: string | null;
  locale: string;
  dateISO: string;
}

export interface HomeVocabLeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  isCurrentUser: boolean;
}

export interface HomeVocabSection {
  today: {
    wordId: string | null;
    href: string;
    isComplete: boolean;
    streak: number;
  };
  leaderboard: {
    seasonId: string | null;
    href: string;
    entries: HomeVocabLeaderboardEntry[];
  };
}

export interface HomeCoachSummary {
  hasUnread: boolean;
  unreadCount: number;
  lastSessionISO: string | null;
  recommendedPrompt: string | null;
  href: string;
  hintsHref: string;
}

export type HomeReportId = 'band-trajectory' | 'skills' | 'time';

export interface HomeReportSummary {
  id: HomeReportId;
  title: string;
  description: string;
  href: string;
  badge: string | null;
  locked: boolean;
}

export interface HomeCalendarDay {
  dateISO: string;
  plannedMinutes: number | null;
  completedMinutes: number | null;
}

export interface HomeCalendar {
  timezone: string;
  weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  days: HomeCalendarDay[];
}

export interface HomeGuideSummary {
  id: string;
  slug: string;
  title: string;
  href: string;
  readingTimeMinutes: number | null;
  imageUrl: string | null;
  category: string | null;
  publishedAtISO: string | null;
}

export interface HomeGuides {
  featured: HomeGuideSummary | null;
  articles: HomeGuideSummary[];
}

export interface HomeLocks {
  modules: Record<HomeModuleId, boolean>;
  coach: {
    chat: boolean;
    hints: boolean;
  };
  vocab: {
    today: boolean;
    leaderboard: boolean;
  };
  reports: Record<HomeReportId, boolean>;
  streak: {
    history: boolean;
    calendar: boolean;
  };
  saved: boolean;
  mistakes: boolean;
  billing: {
    pricing: boolean;
    manage: boolean;
  };
}

export interface HomeUpgradeOffer {
  planId: PlanId;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  expiresAtISO: string | null;
  highlight: 'default' | 'info' | 'success' | 'warning' | 'danger';
}

export interface HomeProps {
  /** ISO timestamp representing when the props were generated. */
  generatedAtISO: string;
  /** Milliseconds timestamp aligned with the server clock. */
  serverNowMsUTC: number;
  /** Launch timestamp used by the hero countdown (if present). */
  launchMsUTC: number;
  user: HomeUser;
  stats: HomeStats;
  nextTask: HomeNextTask | null;
  wordOfDay: HomeWordOfDay | null;
  vocab: HomeVocabSection;
  coach: HomeCoachSummary;
  reports: HomeReportSummary[];
  calendar: HomeCalendar;
  guides: HomeGuides;
  upgradeOffer: HomeUpgradeOffer | null;
  locks: HomeLocks;
}
