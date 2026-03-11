import type { HomeOverviewPayload } from '@/types/home';
import { getPlanPricing, getStandardPlanName } from '@/lib/subscription';

export const getHomeOverviewPayload = (): HomeOverviewPayload => {
  const freePricing = getPlanPricing('free');
  const boosterPricing = getPlanPricing('booster');

  return {
    generatedAt: new Date().toISOString(),
    metadata: {
      freePlanName: getStandardPlanName('free'),
      freePlanMonthlyPrice: freePricing.monthly,
      boosterPlanName: getStandardPlanName('booster'),
      boosterPlanMonthlyPrice: boosterPricing.monthly,
    },
    modules: [
      {
        id: 'learning',
        icon: 'BookOpenCheck',
        title: 'Learning Hub',
        status: { code: 'live', label: 'Live', tone: 'success' },
        availability: { isAvailable: true, label: 'Available now' },
        description: 'Concept lessons, strategy guides, and grammar refreshers wired to your target band.',
        bullets: [
          'Academic & General Training coverage',
          'Micro-lessons for all four skills',
          'AI-personalised paths by band goal',
        ],
        href: '/learning',
      },
      {
        id: 'skill-practice',
        icon: 'Edit3',
        title: 'Skill Practice Arena',
        status: { code: 'live', label: 'Live', tone: 'accent' },
        availability: { isAvailable: true, label: 'Available now' },
        description: 'Focused listening, reading, writing, and speaking practice mapped to real exam sections.',
        bullets: [
          'Dedicated hubs for all four skills',
          'Drills, reviews, and full-section flows',
          'Daily practice loops with saved progress',
        ],
        href: '/mock',
      },
      {
        id: 'mock',
        icon: 'Timer',
        title: 'Full Mock Tests',
        status: { code: 'expanded', label: 'Expanded', tone: 'success' },
        availability: { isAvailable: true, label: 'Available now' },
        description: 'Complete mock ecosystem with reading, listening, speaking, and writing exam simulations.',
        bullets: [
          'Section-based mocks and full exam tracks',
          'Attempt history, review pages, and results',
          'Analytics for speed, accuracy, and mastery',
        ],
        href: '/mock',
      },
      {
        id: 'ai-lab',
        icon: 'Sparkles',
        title: 'AI Lab',
        status: { code: 'core', label: 'Core', tone: 'accent' },
        availability: { isAvailable: true, label: 'Available now' },
        description: 'Where AI Coach, Study Buddy, and Mistakes Book live together.',
        bullets: [
          'Task 1 & 2 band feedback',
          'Speaking insights from audio',
          'Compare “Before vs After” edits',
        ],
        href: '/ai',
      },
      {
        id: 'analytics',
        icon: 'PieChart',
        title: 'Progress & Analytics',
        status: { code: 'live', label: 'Live', tone: 'info' },
        availability: { isAvailable: true, label: 'Available now' },
        description: 'Unified tracking across attempts, streaks, and skill-level improvement signals.',
        bullets: [
          'Band trajectory and forecast signals',
          'Question-type and section diagnostics',
          'Streak + momentum visibility',
        ],
        href: '/progress',
      },
      {
        id: 'gamification',
        icon: 'Trophy',
        title: 'Gamification & Streaks',
        status: { code: 'live', label: 'Live', tone: 'success' },
        availability: { isAvailable: true, label: 'Available now' },
        description: 'Daily streaks, weekly challenges, and quiet competition.',
        bullets: ['Daily streak shields', 'Weekly IELTS challenges', 'Badges for consistency'],
        href: '/dashboard',
      },
    ],
    quickLinks: [
      {
        label: 'Go to dashboard',
        description: 'Continue where you left off.',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        availability: { isAvailable: true, label: 'Available now' },
        actionLabel: 'Open',
      },
      {
        label: 'Finish onboarding',
        description: 'Lock in goal band, exam date, and plan.',
        href: '/profile/setup',
        icon: 'ClipboardCheck',
        availability: { isAvailable: true, label: 'Available now' },
        actionLabel: 'Open',
      },
      {
        label: 'Open AI Coach',
        description: 'Get targeted help for weak areas.',
        href: '/ai/coach',
        icon: 'PenSquare',
        availability: { isAvailable: true, label: 'Available now' },
        actionLabel: 'Open',
      },
      {
        label: 'Resume study buddy',
        description: 'Continue your AI-guided session.',
        href: '/ai/study-buddy',
        icon: 'FileText',
        availability: { isAvailable: true, label: 'Available now' },
        actionLabel: 'Open',
      },
      {
        label: 'Explore Vocabulary Lab',
        description: 'Topic-wise vocab packs for IELTS.',
        href: '/vocabulary',
        icon: 'BookMarked',
        availability: { isAvailable: true, label: 'Available now' },
        actionLabel: 'Open',
      },
      {
        label: 'Check pricing & plans',
        description: `Compare ${getStandardPlanName('free')} and ${getStandardPlanName('booster')} plans.`,
        href: '/pricing',
        icon: 'CreditCard',
        availability: { isAvailable: true, label: 'Available now' },
        actionLabel: 'Open',
      },
    ],
    releaseHighlights: [
      {
        id: 'ai-workspace',
        title: 'AI suite is now a full workspace',
        description:
          'AI Coach, Study Buddy session flows, and Mistakes Book now work as a connected loop instead of isolated tools.',
        href: '/ai',
        ctaLabel: 'Open AI workspace',
        statusLabel: 'Live now',
      },
      {
        id: 'mock-expansion',
        title: 'Mock infrastructure expanded deeply',
        description:
          'Reading and listening now include richer review/result flows, challenge modes, and history pages for consistent prep cycles.',
        href: '/mock/reading',
        ctaLabel: 'Explore mock reading',
        statusLabel: 'Expanded',
      },
      {
        id: 'partners',
        title: 'Institutions and partner paths are live',
        description:
          'Dedicated institution and partner surfaces now support scale usage, team-oriented onboarding, and managed growth tracks.',
        href: '/institutions',
        ctaLabel: 'View institutions',
        statusLabel: 'Live now',
      },
    ],
    testimonials: [
      {
        initials: 'AS',
        name: 'Ayesha S.',
        meta: 'From 6.0 to 7.5 in 7 weeks',
        quote:
          'The AI writing feedback plus streak system basically forced me to stay consistent. It felt like a serious coach, not a random app.',
        resultLabel: 'Overall 7.5',
      },
      {
        initials: 'HM',
        name: 'Hassan M.',
        meta: 'Busy professional, evening prep',
        quote:
          'The daily tasks were small enough for my schedule, but the analytics still showed real progress. Speaking AI saved me from booking endless mock interviews.',
        resultLabel: 'Writing 7.0 → 7.5',
      },
      {
        initials: 'LC',
        name: 'Li C.',
        meta: 'First attempt, overseas study',
        quote:
          'GramorX feels like “mission control” for IELTS. I always knew what to do next instead of scrolling random YouTube videos.',
        resultLabel: 'Overall 7.0',
      },
    ],
  };
};
