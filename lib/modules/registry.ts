import type * as Lucide from 'lucide-react';

export type ModuleIconName = keyof typeof Lucide;

export const MODULE_CAPABILITIES = [
  'learning-content',
  'skill-drills',
  'full-mocks',
  'ai-feedback',
  'progress-analytics',
  'streaks-gamification',
] as const;

export type ModuleCapabilityKey = (typeof MODULE_CAPABILITIES)[number];

export type ModuleRegistryEntry = {
  id: string;
  label: string;
  icon: ModuleIconName;
  baseRoute: `/${string}`;
  capabilityKey?: ModuleCapabilityKey;
};

export const moduleRegistry = {
  learning: {
    id: 'learning',
    label: 'Learning Hub',
    icon: 'BookOpenCheck',
    baseRoute: '/learning',
    capabilityKey: 'learning-content',
  },
  'skill-practice': {
    id: 'skill-practice',
    label: 'Skill Practice Arena',
    icon: 'Edit3',
    baseRoute: '/mock',
    capabilityKey: 'skill-drills',
  },
  mock: {
    id: 'mock',
    label: 'Full Mock Tests',
    icon: 'Timer',
    baseRoute: '/mock',
    capabilityKey: 'full-mocks',
  },
  'ai-lab': {
    id: 'ai-lab',
    label: 'AI Lab',
    icon: 'Sparkles',
    baseRoute: '/ai',
    capabilityKey: 'ai-feedback',
  },
  analytics: {
    id: 'analytics',
    label: 'Progress & Analytics',
    icon: 'PieChart',
    baseRoute: '/progress',
    capabilityKey: 'progress-analytics',
  },
  gamification: {
    id: 'gamification',
    label: 'Gamification & Streaks',
    icon: 'Trophy',
    baseRoute: '/dashboard',
    capabilityKey: 'streaks-gamification',
  },
  listening: {
    id: 'listening',
    label: 'Listening',
    icon: 'Headphones',
    baseRoute: '/practice/listening',
  },
  reading: {
    id: 'reading',
    label: 'Reading',
    icon: 'FileText',
    baseRoute: '/practice/reading',
  },
  writing: {
    id: 'writing',
    label: 'Writing',
    icon: 'PenSquare',
    baseRoute: '/practice/writing',
  },
  speaking: {
    id: 'speaking',
    label: 'Speaking',
    icon: 'Mic2',
    baseRoute: '/practice/speaking',
  },
} as const satisfies Record<string, ModuleRegistryEntry>;

export type ModuleId = keyof typeof moduleRegistry;

const selectModules = <T>(
  defs: ReadonlyArray<{ id: ModuleId } & T>,
): Array<
  {
    id: ModuleId;
    title: string;
    icon: ModuleIconName;
    href: `/${string}`;
    capabilityKey?: ModuleCapabilityKey;
  } & T
> => {
  return defs.map(({ id, ...rest }) => {
    const module = moduleRegistry[id];
    return {
      id,
      title: module.label,
      icon: module.icon,
      href: module.baseRoute,
      capabilityKey: module.capabilityKey,
      ...rest,
    };
  });
};

export type MarketingModuleCard = {
  id: ModuleId;
  title: string;
  icon: ModuleIconName;
  href: `/${string}`;
  status: string;
  statusTone: 'success' | 'accent' | 'info';
  description: string;
  bullets: string[];
  capabilityKey?: ModuleCapabilityKey;
};

export const getMarketingModuleCards = (): MarketingModuleCard[] =>
  selectModules([
    {
      id: 'learning',
      status: 'Live',
      statusTone: 'success',
      description:
        'Concept lessons, strategy guides, and grammar refreshers wired to your target band.',
      bullets: [
        'Academic & General Training coverage',
        'Micro-lessons for all four skills',
        'AI-personalised paths by band goal',
      ],
    },
    {
      id: 'skill-practice',
      status: 'Live',
      statusTone: 'accent',
      description:
        'Focused listening, reading, writing, and speaking practice mapped to real exam sections.',
      bullets: [
        'Dedicated hubs for all four skills',
        'Drills, reviews, and full-section flows',
        'Daily practice loops with saved progress',
      ],
    },
    {
      id: 'mock',
      status: 'Expanded',
      statusTone: 'success',
      description:
        'Complete mock ecosystem with reading, listening, speaking, and writing exam simulations.',
      bullets: [
        'Section-based mocks and full exam tracks',
        'Attempt history, review pages, and results',
        'Analytics for speed, accuracy, and mastery',
      ],
    },
    {
      id: 'ai-lab',
      status: 'Core',
      statusTone: 'accent',
      description: 'Where AI Coach, Study Buddy, and Mistakes Book live together.',
      bullets: [
        'Task 1 & 2 band feedback',
        'Speaking insights from audio',
        'Compare “Before vs After” edits',
      ],
    },
    {
      id: 'analytics',
      status: 'Live',
      statusTone: 'info',
      description: 'Unified tracking across attempts, streaks, and skill-level improvement signals.',
      bullets: [
        'Band trajectory and forecast signals',
        'Question-type and section diagnostics',
        'Streak + momentum visibility',
      ],
    },
    {
      id: 'gamification',
      status: 'Live',
      statusTone: 'success',
      description: 'Daily streaks, weekly challenges, and quiet competition.',
      bullets: ['Daily streak shields', 'Weekly IELTS challenges', 'Badges for consistency'],
    },
  ]);

export type DashboardModuleCard = {
  id: ModuleId;
  title: string;
  icon: ModuleIconName;
  href: `/${string}`;
  label: string;
  description: string;
  bullets: string[];
  tag?: string;
  capabilityKey?: ModuleCapabilityKey;
};

export const getDashboardModuleCards = (): DashboardModuleCard[] =>
  selectModules([
    {
      id: 'listening',
      label: 'Audio-first drills',
      description:
        'Exam-style recordings with question sets that train both speed and accuracy.',
      bullets: [
        'Short & full-length recordings',
        'Question types mirrored from real tests',
        'Future: accent diversity & playlists',
      ],
      tag: 'Core module',
    },
    {
      id: 'reading',
      label: 'Passages & item types',
      description:
        'Skim, scan and solve under time pressure — with explanations that don’t waste time.',
      bullets: [
        'True/False/Not Given, MCQs, matching',
        'Guided review of wrong answers',
        'Future: difficulty ladder per band',
      ],
      tag: 'Core module',
    },
    {
      id: 'writing',
      label: 'Task 1 & Task 2',
      description:
        'Structure, coherence, lexical resource and grammar checked with AI and clear tips.',
      bullets: [
        'Band-style rubric breakdown',
        'Before / After comparisons in AI Lab',
        'Future: teacher plug-in for manual review',
      ],
      tag: 'AI-heavy',
    },
    {
      id: 'speaking',
      label: 'Record & review',
      description:
        'Prompt packs for Parts 1, 2 and 3 with AI insights on fluency, vocab and pronunciation.',
      bullets: [
        'Record directly in browser',
        'Part-wise scoring hints',
        'Future: conversation-style dialogues',
      ],
      tag: 'AI-heavy',
    },
    {
      id: 'ai-lab',
      label: 'Your experiment space',
      description:
        'Try answers, tweak phrasing, and compare versions side by side before the real exam.',
      bullets: [
        'Writing + Speaking pipelines',
        '“Compare Before / After” mode',
        'Future: cross-attempt insights',
      ],
      tag: 'Always-on coach',
    },
    {
      id: 'analytics',
      label: 'Progress, not vibes',
      description:
        'Band trajectory, time on task, accuracy by question type and meaningful streaks.',
      bullets: [
        'Band curve across modules',
        'Time spent vs. results',
        'Streaks focused on real study, not taps',
      ],
      tag: 'For serious prep',
    },
  ]);
