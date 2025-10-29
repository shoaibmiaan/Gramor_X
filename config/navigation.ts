// config/navigation.ts
import type {
  AppNavigationSchema,
  NavItemConfig,
  SubscriptionTier,
} from '@/lib/navigation/types';

const authenticatedGate = { requiresAuth: true } as const;

const headerMain: NavItemConfig[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'practice', label: 'Practice', href: '/learning' },
  { id: 'mock-tests', label: 'Mock Tests', href: '/mock-tests' },
  {
    id: 'challenge',
    label: 'Challenge',
    href: '/challenge',
    featureGate: { featureToggle: 'weeklyChallenge' },
  },
];

const aiTools: NavItemConfig[] = [
  {
    id: 'study-buddy',
    label: 'Study Buddy',
    href: '/study-plan',
    icon: 'Sparkles',
    featureGate: { featureToggle: 'studyBuddy' },
  },
  {
    id: 'mistakes-book',
    label: 'Mistakes Book',
    href: '/mistakes',
    icon: 'BookOpenCheck',
    featureGate: { featureToggle: 'mistakesBook', requiresAuth: true },
  },
  {
    id: 'band-predictor',
    label: 'Band Predictor',
    href: '/predictor',
    icon: 'Gauge',
    featureGate: { featureToggle: 'bandPredictor' },
  },
  {
    id: 'writing-evaluator',
    label: 'Writing Evaluator',
    href: '/ai/writing',
    icon: 'PenSquare',
    badge: 'Soon',
    featureGate: { requiresAuth: true, minTier: 'rocket' },
  },
];

const profileMenu: NavItemConfig[] = [
  { id: 'profile', label: 'My Profile', href: '/profile', featureGate: authenticatedGate },
  { id: 'notifications', label: 'Notifications', href: '/notifications', featureGate: authenticatedGate },
  {
    id: 'mistakes',
    label: 'My Mistakes',
    href: '/mistakes',
    featureGate: { featureToggle: 'mistakesBook', requiresAuth: true },
  },
  { id: 'stats', label: 'My Stats', href: '/progress', featureGate: authenticatedGate },
  { id: 'settings', label: 'Settings', href: '/settings', featureGate: authenticatedGate },
];

export const navigationSchema: AppNavigationSchema = {
  header: {
    main: headerMain,
    aiTools,
    profile: profileMenu,
    cta: {
      guest: { label: 'Start Practicing', href: '/signup' },
      authed: null,
    },
    optional: {
      themeToggle: true,
      localeSwitch: false,
      notifications: true,
    },
  },
  sidebar: [
    {
      id: 'learning',
      label: 'Learning',
      icon: 'BookOpen',
      items: [
        { id: 'practice-modules', label: 'Practice Modules', href: '/learning' },
        { id: 'mock-exams', label: 'Mock Exams', href: '/mock-tests' },
        {
          id: 'my-mistakes',
          label: 'My Mistakes',
          href: '/mistakes',
          featureGate: { featureToggle: 'mistakesBook', requiresAuth: true },
        },
        {
          id: 'study-buddy',
          label: 'Study Buddy',
          href: '/study-plan',
          featureGate: { featureToggle: 'studyBuddy' },
        },
      ],
    },
    {
      id: 'ai-tools',
      label: 'AI & Tools',
      icon: 'Sparkles',
      items: [
        {
          id: 'band-predictor',
          label: 'Band Predictor',
          href: '/predictor',
          featureGate: { featureToggle: 'bandPredictor' },
        },
        {
          id: 'mistakes-review',
          label: 'Mistakes Book',
          href: '/mistakes',
          featureGate: { featureToggle: 'mistakesBook', requiresAuth: true },
        },
        {
          id: 'writing-evaluator',
          label: 'Writing Evaluator',
          href: '/ai/writing',
          badge: 'Soon',
          featureGate: { requiresAuth: true, minTier: 'rocket' },
        },
      ],
    },
    {
      id: 'motivation',
      label: 'Motivation',
      icon: 'Trophy',
      items: [
        {
          id: 'weekly-challenge',
          label: 'Weekly Challenge',
          href: '/challenge',
          featureGate: { featureToggle: 'weeklyChallenge' },
        },
        { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' },
        { id: 'streaks', label: 'Streaks', href: '/progress?tab=streaks' },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: 'MessageCircle',
      items: [
        {
          id: 'whatsapp-tasks',
          label: 'WhatsApp Tasks',
          href: '/dashboard#whatsapp',
          featureGate: { featureToggle: 'whatsappTasks', requiresAuth: true },
        },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      icon: 'User',
      items: [
        { id: 'profile', label: 'Profile', href: '/profile', featureGate: authenticatedGate },
        { id: 'subscription', label: 'Subscription', href: '/account/billing', featureGate: authenticatedGate },
        { id: 'settings', label: 'Settings', href: '/settings', featureGate: authenticatedGate },
      ],
    },
  ],
  footer: [
    {
      id: 'product',
      label: 'Product',
      items: [
        { id: 'pricing', label: 'Pricing', href: '/pricing' },
        { id: 'practice', label: 'Practice Modules', href: '/learning' },
        { id: 'mock-tests', label: 'Mock Tests', href: '/mock-tests' },
        { id: 'premium-plans', label: 'Premium Plans', href: '/premium' },
      ],
    },
    {
      id: 'support',
      label: 'Support',
      items: [
        { id: 'faq', label: 'FAQs', href: '/faq' },
        { id: 'community-hub', label: 'Community', href: '/community' },
        {
          id: 'support-email',
          label: 'Email Support',
          href: 'mailto:support@gramorx.com',
          external: true,
          target: '_blank',
        },
        {
          id: 'whatsapp-support',
          label: 'WhatsApp Support',
          href: 'https://wa.me/19722954571',
          external: true,
          target: '_blank',
        },
      ],
    },
    {
      id: 'legal',
      label: 'Legal',
      items: [
        { id: 'terms', label: 'Terms', href: '/legal/terms' },
        { id: 'privacy', label: 'Privacy', href: '/legal/privacy' },
        { id: 'refund', label: 'Refund Policy', href: '/legal/terms#refunds' },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      items: [
        { id: 'blog', label: 'Blog', href: '/blog' },
        {
          id: 'instagram',
          label: 'Instagram',
          href: 'https://instagram.com/gramor_x',
          external: true,
          target: '_blank',
        },
        {
          id: 'youtube',
          label: 'YouTube',
          href: 'https://youtube.com/@gramor_x',
          external: true,
          target: '_blank',
        },
        {
          id: 'telegram',
          label: 'Telegram',
          href: 'https://t.me/gramorx',
          external: true,
          target: '_blank',
        },
      ],
    },
  ],
  floating: {
    quickActions: [
      {
        id: 'daily-task',
        label: 'Daily Task',
        href: '/dashboard#tasks',
        icon: 'CalendarCheck',
        featureGate: { featureToggle: 'whatsappTasks', requiresAuth: true },
      },
      {
        id: 'retry-mistakes',
        label: 'Retry Mistakes',
        href: '/mistakes',
        icon: 'RotateCcw',
        featureGate: { featureToggle: 'mistakesBook', requiresAuth: true },
      },
      {
        id: 'weekly-challenge',
        label: 'Join Weekly Challenge',
        href: '/challenge',
        icon: 'Trophy',
        featureGate: { featureToggle: 'weeklyChallenge' },
      },
    ],
  },
};

export const defaultTier: SubscriptionTier = 'free';
