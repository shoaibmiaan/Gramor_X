// lib/dashboard/getDashboardData.ts

export type TodayTaskType = 'learning' | 'practice' | 'mock';

export interface TodayTask {
  id: string;
  type: TodayTaskType;
  title: string;
  description: string;
  estimatedMinutes: number;
  href: string;
}

export interface SkillProgress {
  id: string;
  name: string;
  currentScoreLabel: string;
  trendLabel: string;
  trendDirection: 'up' | 'down' | 'flat';
  detail: string;
  href: string;
}

export interface MockSummaryData {
  totalAttempts: number;
  bestBand: number | null;
  lastBand: number | null;
  lastAttemptAt: string | null; // ISO date
  nextRecommendedMockHref: string;
}

export interface GamificationSummaryData {
  streakDays: number;
  xpThisWeek: number;
  totalXp: number;
  leaderboardRank: number | null; // 1-based or null if not ranked
  leaderboardPercentile: number | null;
  leaderboardHref: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  href: string;
}

export interface AIInsight {
  id: string;
  title: string;
  body: string;
  href?: string;
}

export interface ProfileSummary {
  name: string;
  goalBand: number;
  currentBandEstimate: number;
  targetExamDate: string; // ISO date
  daysLeft: number;
}

export interface DashboardData {
  profile: ProfileSummary;
  todayTasks: TodayTask[];
  skills: SkillProgress[];
  mockSummary: MockSummaryData;
  gamification: GamificationSummaryData;
  quickActions: QuickAction[];
  insights: AIInsight[];
}

/**
 * For now this returns mocked data.
 * Later you can replace this with Supabase queries based on userId.
 */
export function getDashboardData(userId?: string): DashboardData {
  // TODO: wire to Supabase using userId
  return {
    profile: {
      name: 'Ali',
      goalBand: 7.0,
      currentBandEstimate: 6.0,
      targetExamDate: '2026-02-20',
      daysLeft: 98,
    },
    todayTasks: [
      {
        id: 't1',
        type: 'learning',
        title: 'Grammar – Linking words for coherence',
        description: 'Short micro-lesson focused on contrast & addition linkers.',
        estimatedMinutes: 10,
        href: '/writing/learn/coherence-linking-words',
      },
      {
        id: 't2',
        type: 'practice',
        title: 'Reading – True / False / Not Given',
        description: '10 targeted questions based on your latest mistakes.',
        estimatedMinutes: 12,
        href: '/reading/practice/true-false-not-given',
      },
      {
        id: 't3',
        type: 'mock',
        title: 'Speaking – Part 2 (Cue card)',
        description: 'Record 1 full response and get instant AI feedback.',
        estimatedMinutes: 5,
        href: '/speaking/mock/part2',
      },
    ],
    skills: [
      {
        id: 's-reading',
        name: 'Reading',
        currentScoreLabel: '62% accuracy',
        trendLabel: '+7% this week',
        trendDirection: 'up',
        detail: 'Weak on Matching Information & TFNG.',
        href: '/reading/dashboard',
      },
      {
        id: 's-listening',
        name: 'Listening',
        currentScoreLabel: '58% accuracy',
        trendLabel: '-3% this week',
        trendDirection: 'down',
        detail: 'Part 3 conversations need work.',
        href: '/listening/dashboard',
      },
      {
        id: 's-writing',
        name: 'Writing',
        currentScoreLabel: 'Band 5.5',
        trendLabel: '+0.5 in last 2 weeks',
        trendDirection: 'up',
        detail: 'Grammar & examples in Task 2 are main gaps.',
        href: '/writing/dashboard',
      },
      {
        id: 's-speaking',
        name: 'Speaking',
        currentScoreLabel: 'Band 5.0',
        trendLabel: 'Flat this week',
        trendDirection: 'flat',
        detail: 'Coherence and fluency need more practice.',
        href: '/speaking/dashboard',
      },
    ],
    mockSummary: {
      totalAttempts: 4,
      bestBand: 6.0,
      lastBand: 5.5,
      lastAttemptAt: '2025-11-10',
      nextRecommendedMockHref: '/mock/ielts-full-test',
    },
    gamification: {
      streakDays: 4,
      xpThisWeek: 420,
      totalXp: 2130,
      leaderboardRank: 37,
      leaderboardPercentile: 82,
      leaderboardHref: '/leaderboard',
    },
    quickActions: [
      {
        id: 'qa-learning',
        label: 'Continue Learning',
        description: 'Jump back into your last lesson.',
        href: '/learning/continue',
      },
      {
        id: 'qa-practice',
        label: 'Continue Practice',
        description: 'Resume your active practice set.',
        href: '/practice/continue',
      },
      {
        id: 'qa-mock',
        label: 'Resume Mock Exam',
        description: 'Pick up where you left in the last mock.',
        href: '/mock/continue',
      },
      {
        id: 'qa-mistakes',
        label: 'Review Mistakes Book',
        description: 'Turn your mistakes into free marks.',
        href: '/mistakes',
      },
      {
        id: 'qa-plan',
        label: 'View Study Plan',
        description: 'See your roadmap to your target band.',
        href: '/plan',
      },
    ],
    insights: [
      {
        id: 'i1',
        title: 'Listening Part 3 accuracy dropped by 6% on Thursday.',
        body: 'You tend to miss questions where speakers disagree or partially agree. Focus on “attitude” and “opinion change” cues.',
        href: '/listening/learn/attitude-opinion',
      },
      {
        id: 'i2',
        title: 'Writing Task 2 examples are too generic.',
        body: 'Your ideas are fine, but examples are vague. Practice 3 responses where you use specific, realistic examples.',
        href: '/writing/practice/task2-examples',
      },
    ],
  };
}
