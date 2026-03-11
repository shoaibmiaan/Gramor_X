import { featureFlags, type FeatureToggleKey } from '@/lib/constants/features';
import { flags, type FeatureFlagKey } from '@/lib/flags';
import type { IconName } from '@/components/design-system/Icon';

type HomeModuleTone = 'success' | 'accent' | 'info' | 'warning' | 'neutral';

type BaseModule = {
  id: 'learning' | 'skill-practice' | 'mock' | 'ai-lab' | 'analytics' | 'gamification';
  icon: IconName;
  title: string;
  description: string;
  bullets: string[];
  href: string;
};

export type HomeModuleCard = BaseModule & {
  isEnabled: boolean;
  statusLabel: string;
  statusTone: HomeModuleTone;
  reason: string | null;
  ctaHref: string;
};

export type ComputeHomeModuleCardsOptions = {
  featureToggleSnapshot?: Partial<Record<FeatureToggleKey, boolean>>;
  flagEnabled?: (key: FeatureFlagKey) => boolean;
};

const BASE_MODULES: BaseModule[] = [
  {
    id: 'learning',
    icon: 'BookOpenCheck',
    title: 'Learning Hub',
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
    description: 'Daily streaks, weekly challenges, and quiet competition.',
    bullets: ['Daily streak shields', 'Weekly IELTS challenges', 'Badges for consistency'],
    href: '/dashboard',
  },
];

export function computeHomeModuleCards(options: ComputeHomeModuleCardsOptions = {}): HomeModuleCard[] {
  const toggles: Record<FeatureToggleKey, boolean> = {
    ...featureFlags,
    ...(options.featureToggleSnapshot ?? {}),
  };
  const flagEnabled = options.flagEnabled ?? ((key: FeatureFlagKey) => flags.enabled(key));

  const aiLabEnabled =
    toggles.aiCoach || toggles.studyBuddy || toggles.mistakesBook || flagEnabled('coach');
  const weeklyChallengeEnabled = toggles.weeklyChallenge || flagEnabled('challenge');

  return BASE_MODULES.map((module): HomeModuleCard => {
    if (module.id === 'ai-lab') {
      if (aiLabEnabled) {
        return {
          ...module,
          isEnabled: true,
          statusLabel: 'Core',
          statusTone: 'accent',
          reason: null,
          ctaHref: module.href,
        };
      }
      return {
        ...module,
        isEnabled: false,
        statusLabel: 'Gated',
        statusTone: 'warning',
        reason: 'AI Lab requires an active AI feature flag or plan access.',
        ctaHref: '/pricing',
      };
    }

    if (module.id === 'analytics') {
      if (toggles.bandPredictor) {
        return {
          ...module,
          isEnabled: true,
          statusLabel: 'Live',
          statusTone: 'info',
          reason: null,
          ctaHref: module.href,
        };
      }
      return {
        ...module,
        isEnabled: true,
        statusLabel: 'Limited',
        statusTone: 'neutral',
        reason: 'Band predictor insights are currently turned off for this environment.',
        ctaHref: module.href,
      };
    }

    if (module.id === 'gamification') {
      if (weeklyChallengeEnabled) {
        return {
          ...module,
          isEnabled: true,
          statusLabel: 'Live',
          statusTone: 'success',
          reason: null,
          ctaHref: module.href,
        };
      }
      return {
        ...module,
        isEnabled: false,
        statusLabel: 'Onboarding',
        statusTone: 'neutral',
        reason: 'Complete setup to unlock weekly challenges and leaderboard competitions.',
        ctaHref: '/profile/setup',
      };
    }

    if (module.id === 'mock') {
      return {
        ...module,
        isEnabled: true,
        statusLabel: 'Expanded',
        statusTone: 'success',
        reason: null,
        ctaHref: module.href,
      };
    }

    if (module.id === 'skill-practice') {
      return {
        ...module,
        isEnabled: true,
        statusLabel: 'Live',
        statusTone: 'accent',
        reason: null,
        ctaHref: module.href,
      };
    }

    return {
      ...module,
      isEnabled: true,
      statusLabel: 'Live',
      statusTone: 'success',
      reason: null,
      ctaHref: module.href,
    };
  });
}
