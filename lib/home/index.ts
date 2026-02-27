// lib/home/index.ts
// -----------------------------------------------------------------------------
// Utilities for working with the HomeProps contract, including a strongly typed
// guest fallback used for SSR bootstrapping and tests. The helpers here avoid
// leaking implementation details to consuming components while guaranteeing that
// every section of the home experience receives predictable data.
// -----------------------------------------------------------------------------

import type {
  HomeCalendar,
  HomeCalendarDay,
  HomeCoachSummary,
  HomeGuides,
  HomeLocks,
  HomeModuleStat,
  HomeProps,
  HomeReportSummary,
  HomeStats,
  HomeUpgradeOffer,
  HomeUser,
  HomeVocabLeaderboardEntry,
  HomeVocabSection,
} from '@/types/home';
import { PLANS } from '@/types/pricing';

const FREE_PLAN = PLANS.free;

const GUEST_USER: HomeUser = {
  id: 'guest',
  email: null,
  fullName: 'Guest',
  firstName: 'Guest',
  avatarUrl: null,
  planId: 'free',
  planName: FREE_PLAN.name,
  isTrialing: false,
  trialEndsAtISO: null,
  timezone: 'UTC',
  locale: 'en',
  abVariant: null,
  roles: [],
  isGuest: true,
  featureFlags: [],
};

const GUEST_MODULE_STATS: HomeModuleStat[] = [
  {
    id: 'listening',
    label: 'Listening',
    href: '/listening',
    progressPercent: null,
    trend: null,
    lastActivityISO: null,
    completions: 0,
    locked: true,
    badge: null,
  },
  {
    id: 'reading',
    label: 'Reading',
    href: '/reading',
    progressPercent: null,
    trend: null,
    lastActivityISO: null,
    completions: 0,
    locked: true,
    badge: null,
  },
  {
    id: 'writing',
    label: 'Writing',
    href: '/writing',
    progressPercent: null,
    trend: null,
    lastActivityISO: null,
    completions: 0,
    locked: true,
    badge: null,
  },
  {
    id: 'speaking',
    label: 'Speaking',
    href: '/speaking',
    progressPercent: null,
    trend: null,
    lastActivityISO: null,
    completions: 0,
    locked: true,
    badge: null,
  },
  {
    id: 'mock',
    label: 'Mock Tests',
    href: '/mock',
    progressPercent: null,
    trend: null,
    lastActivityISO: null,
    completions: 0,
    locked: true,
    badge: null,
  },
];

const GUEST_STATS: HomeStats = {
  streak: {
    current: 0,
    best: 0,
    target: 1,
    timezone: 'UTC',
    lastCompletedAtISO: null,
  },
  modules: GUEST_MODULE_STATS,
  saved: {
    total: 0,
    lastAddedISO: null,
  },
  mistakes: {
    total: 0,
    unresolved: 0,
    lastReviewedISO: null,
  },
};

const GUEST_VOCAB_LEADERBOARD: HomeVocabLeaderboardEntry[] = [];

const GUEST_VOCAB: HomeVocabSection = {
  today: {
    wordId: null,
    href: '/vocab/today',
    isComplete: false,
    streak: 0,
  },
  leaderboard: {
    seasonId: null,
    href: '/vocab/leaderboard',
    entries: GUEST_VOCAB_LEADERBOARD,
  },
};

const GUEST_COACH: HomeCoachSummary = {
  hasUnread: false,
  unreadCount: 0,
  lastSessionISO: null,
  recommendedPrompt: null,
  href: '/coach',
  hintsHref: '/coach?view=hints',
};

const GUEST_REPORTS: HomeReportSummary[] = [
  {
    id: 'band-trajectory',
    title: 'Band trajectory',
    description: 'Track how your predicted band evolves over time.',
    href: '/reports/band-trajectory',
    badge: null,
    locked: true,
  },
  {
    id: 'skills',
    title: 'Skill insights',
    description: 'Compare strengths and gaps across IELTS skill areas.',
    href: '/reports/skills',
    badge: null,
    locked: true,
  },
  {
    id: 'time',
    title: 'Study time',
    description: 'Review how you are investing your study minutes each week.',
    href: '/reports/time',
    badge: null,
    locked: true,
  },
];

const GUEST_CALENDAR_DAYS: HomeCalendarDay[] = [];

const GUEST_CALENDAR: HomeCalendar = {
  timezone: 'UTC',
  weekStart: 1,
  days: GUEST_CALENDAR_DAYS,
};

const GUEST_GUIDES: HomeGuides = {
  featured: null,
  articles: [],
};

const GUEST_UPGRADE_OFFER: HomeUpgradeOffer = {
  planId: 'starter',
  title: 'Unlock your personalized IELTS roadmap',
  body: 'Create a free account to save progress and access adaptive study plans.',
  ctaLabel: 'Explore plans',
  href: '/pricing',
  expiresAtISO: null,
  highlight: 'info',
};

const GUEST_LOCKS: HomeLocks = {
  modules: {
    listening: true,
    reading: true,
    writing: true,
    speaking: true,
    mock: true,
  },
  coach: {
    chat: true,
    hints: true,
  },
  vocab: {
    today: true,
    leaderboard: true,
  },
  reports: {
    'band-trajectory': true,
    skills: true,
    time: true,
  },
  streak: {
    history: true,
    calendar: true,
  },
  saved: true,
  mistakes: true,
  billing: {
    pricing: false,
    manage: true,
  },
};

const BASE_GUEST_HOME_PROPS: HomeProps = {
  generatedAtISO: new Date(0).toISOString(),
  serverNowMsUTC: 0,
  launchMsUTC: 0,
  user: GUEST_USER,
  stats: GUEST_STATS,
  nextTask: null,
  wordOfDay: null,
  vocab: GUEST_VOCAB,
  coach: GUEST_COACH,
  reports: GUEST_REPORTS,
  calendar: GUEST_CALENDAR,
  guides: GUEST_GUIDES,
  upgradeOffer: GUEST_UPGRADE_OFFER,
  locks: GUEST_LOCKS,
};

function cloneGuestBase(): HomeProps {
  return {
    ...BASE_GUEST_HOME_PROPS,
    user: { ...BASE_GUEST_HOME_PROPS.user },
    stats: {
      ...BASE_GUEST_HOME_PROPS.stats,
      streak: { ...BASE_GUEST_HOME_PROPS.stats.streak },
      saved: { ...BASE_GUEST_HOME_PROPS.stats.saved },
      mistakes: { ...BASE_GUEST_HOME_PROPS.stats.mistakes },
      modules: BASE_GUEST_HOME_PROPS.stats.modules.map((module) => ({ ...module })),
    },
    nextTask: BASE_GUEST_HOME_PROPS.nextTask ? { ...BASE_GUEST_HOME_PROPS.nextTask } : null,
    wordOfDay: BASE_GUEST_HOME_PROPS.wordOfDay ? { ...BASE_GUEST_HOME_PROPS.wordOfDay } : null,
    vocab: {
      today: { ...BASE_GUEST_HOME_PROPS.vocab.today },
      leaderboard: {
        ...BASE_GUEST_HOME_PROPS.vocab.leaderboard,
        entries: BASE_GUEST_HOME_PROPS.vocab.leaderboard.entries.map((entry) => ({ ...entry })),
      },
    },
    coach: { ...BASE_GUEST_HOME_PROPS.coach },
    reports: BASE_GUEST_HOME_PROPS.reports.map((report) => ({ ...report })),
    calendar: {
      ...BASE_GUEST_HOME_PROPS.calendar,
      days: BASE_GUEST_HOME_PROPS.calendar.days.map((day) => ({ ...day })),
    },
    guides: {
      featured: BASE_GUEST_HOME_PROPS.guides.featured
        ? { ...BASE_GUEST_HOME_PROPS.guides.featured }
        : null,
      articles: BASE_GUEST_HOME_PROPS.guides.articles.map((article) => ({ ...article })),
    },
    upgradeOffer: BASE_GUEST_HOME_PROPS.upgradeOffer
      ? { ...BASE_GUEST_HOME_PROPS.upgradeOffer }
      : null,
    locks: {
      ...BASE_GUEST_HOME_PROPS.locks,
      modules: { ...BASE_GUEST_HOME_PROPS.locks.modules },
      coach: { ...BASE_GUEST_HOME_PROPS.locks.coach },
      vocab: { ...BASE_GUEST_HOME_PROPS.locks.vocab },
      reports: { ...BASE_GUEST_HOME_PROPS.locks.reports },
      streak: { ...BASE_GUEST_HOME_PROPS.locks.streak },
      billing: { ...BASE_GUEST_HOME_PROPS.locks.billing },
    },
  };
}

export function createGuestHomeProps(overrides: Partial<HomeProps> = {}): HomeProps {
  const base = cloneGuestBase();

  const result: HomeProps = {
    ...base,
    ...overrides,
    user: { ...base.user, ...overrides.user },
    stats: {
      ...base.stats,
      ...overrides.stats,
      streak: {
        ...base.stats.streak,
        ...(overrides.stats?.streak ?? {}),
      },
      saved: {
        ...base.stats.saved,
        ...(overrides.stats?.saved ?? {}),
      },
      mistakes: {
        ...base.stats.mistakes,
        ...(overrides.stats?.mistakes ?? {}),
      },
      modules:
        overrides.stats?.modules?.map((module) => ({ ...module })) ??
        base.stats.modules.map((module) => ({ ...module })),
    },
    nextTask:
      overrides.nextTask != null
        ? overrides.nextTask
          ? { ...overrides.nextTask }
          : null
        : base.nextTask,
    wordOfDay:
      overrides.wordOfDay != null
        ? overrides.wordOfDay
          ? { ...overrides.wordOfDay }
          : null
        : base.wordOfDay,
    vocab: {
      today: { ...base.vocab.today, ...(overrides.vocab?.today ?? {}) },
      leaderboard: {
        ...base.vocab.leaderboard,
        ...(overrides.vocab?.leaderboard ?? {}),
        entries:
          overrides.vocab?.leaderboard?.entries?.map((entry) => ({ ...entry })) ??
          base.vocab.leaderboard.entries.map((entry) => ({ ...entry })),
      },
    },
    coach: { ...base.coach, ...overrides.coach },
    reports:
      overrides.reports?.map((report) => ({ ...report })) ??
      base.reports.map((report) => ({ ...report })),
    calendar: {
      ...base.calendar,
      ...(overrides.calendar ?? {}),
      days:
        overrides.calendar?.days?.map((day) => ({ ...day })) ??
        base.calendar.days.map((day) => ({ ...day })),
    },
    guides: {
      featured:
        overrides.guides?.featured != null
          ? overrides.guides.featured
            ? { ...overrides.guides.featured }
            : null
          : base.guides.featured
            ? { ...base.guides.featured }
            : null,
      articles:
        overrides.guides?.articles?.map((article) => ({ ...article })) ??
        base.guides.articles.map((article) => ({ ...article })),
    },
    upgradeOffer:
      overrides.upgradeOffer != null
        ? overrides.upgradeOffer
          ? { ...overrides.upgradeOffer }
          : null
        : base.upgradeOffer
          ? { ...base.upgradeOffer }
          : null,
    locks: {
      ...base.locks,
      ...overrides.locks,
      modules: { ...base.locks.modules, ...(overrides.locks?.modules ?? {}) },
      coach: { ...base.locks.coach, ...(overrides.locks?.coach ?? {}) },
      vocab: { ...base.locks.vocab, ...(overrides.locks?.vocab ?? {}) },
      reports: { ...base.locks.reports, ...(overrides.locks?.reports ?? {}) },
      streak: { ...base.locks.streak, ...(overrides.locks?.streak ?? {}) },
      billing: { ...base.locks.billing, ...(overrides.locks?.billing ?? {}) },
    },
  };

  if (overrides.serverNowMsUTC == null) {
    result.serverNowMsUTC = Date.now();
  }

  if (!overrides.generatedAtISO) {
    const timestampSource = overrides.serverNowMsUTC ?? result.serverNowMsUTC;
    result.generatedAtISO = new Date(timestampSource || Date.now()).toISOString();
  }

  if (!overrides.stats?.streak?.timezone) {
    result.stats.streak.timezone = result.user.timezone;
  }

  if (!overrides.calendar?.timezone) {
    result.calendar.timezone = result.user.timezone;
  }

  return result;
}

export const GUEST_HOME_PROPS: HomeProps = createGuestHomeProps();
