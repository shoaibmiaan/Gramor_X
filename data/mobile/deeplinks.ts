// data/mobile/deeplinks.ts
import type { PlanId } from '@/types/pricing';
import type { AppRole } from '@/lib/roles';

export type DeeplinkDefinition = {
  slug: string;
  href: string;
  minPlan: PlanId;
  /** Whether authentication is required. Defaults to `minPlan !== 'free'`. */
  requiresAuth?: boolean;
  /** Roles that may bypass the plan requirement (admins are always allowed). */
  allowRoles?: AppRole[];
  /** Optional hard role restriction. */
  restrictedTo?: AppRole[];
  /** Human description for documentation / debugging. */
  description?: string;
};

const definitions: DeeplinkDefinition[] = [
  {
    slug: 'home',
    href: '/',
    minPlan: 'free',
    requiresAuth: false,
    description: 'Marketing landing page',
  },
  {
    slug: 'login',
    href: '/login',
    minPlan: 'free',
    requiresAuth: false,
    description: 'Login screen',
  },
  {
    slug: 'signup',
    href: '/signup',
    minPlan: 'free',
    requiresAuth: false,
    description: 'Account creation flow',
  },
  {
    slug: 'dashboard',
    href: '/dashboard',
    minPlan: 'starter',
    description: 'Student dashboard overview',
  },
  {
    slug: 'study-plan',
    href: '/study-plan',
    minPlan: 'starter',
    description: 'AI Study Buddy planner',
  },
  {
    slug: 'mistakes-book',
    href: '/mistakes',
    minPlan: 'booster',
    allowRoles: ['teacher'],
    description: 'Mistakes tracker with AI review',
  },
  {
    slug: 'predictor',
    href: '/predictor',
    minPlan: 'booster',
    description: 'Band predictor analytics',
  },
  {
    slug: 'reports',
    href: '/reports',
    minPlan: 'starter',
    description: 'Progress reports hub',
  },
  {
    slug: 'orgs',
    href: '/orgs',
    minPlan: 'master',
    allowRoles: ['teacher'],
    description: 'Institutions / cohort management',
  },
  {
    slug: 'admin-flags',
    href: '/admin/flags',
    minPlan: 'master',
    restrictedTo: ['admin'],
    description: 'Admin feature flag controls',
  },
  {
    slug: 'teacher-home',
    href: '/teacher',
    minPlan: 'starter',
    restrictedTo: ['teacher', 'admin'],
    description: 'Teacher dashboard shell',
  },
  {
    slug: 'mock-tests',
    href: '/mock-tests',
    minPlan: 'free',
    description: 'Mock test catalogue',
  },
  {
    slug: 'challenge',
    href: '/challenge',
    minPlan: 'free',
    description: 'Weekly challenge landing',
  },
];

export const DEEPLINK_DEFINITIONS: readonly DeeplinkDefinition[] = definitions;

export const DEEPLINK_LOOKUP: Record<string, DeeplinkDefinition> = Object.fromEntries(
  definitions.map((def) => [def.slug, def]),
);

export const UNIVERSAL_LINK_PATHS: readonly string[] = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/dashboard/*',
  '/study-plan',
  '/study-plan/*',
  '/mistakes',
  '/mistakes/*',
  '/predictor',
  '/predictor/*',
  '/reports',
  '/reports/*',
  '/orgs',
  '/orgs/*',
  '/admin/*',
  '/teacher',
  '/teacher/*',
  '/learning',
  '/learning/*',
  '/mock-tests',
  '/mock-tests/*',
  '/challenge',
  '/challenge/*',
];

export type AndroidAssetLinkStatement = {
  relation: string[];
  target: {
    namespace: 'android_app';
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export const ANDROID_ASSET_LINKS: readonly AndroidAssetLinkStatement[] = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.gramorx.portal',
      sha256_cert_fingerprints: [
        '3A:76:5C:9F:12:34:56:78:90:AB:CD:EF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:12:34:56:78',
      ],
    },
  },
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.gramorx.portal.beta',
      sha256_cert_fingerprints: [
        '7B:2F:10:98:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:10:32:54:76:98:BA:DC:FE:21:43:65:87:A9:CB',
      ],
    },
  },
];

const APPLE_TEAM_ID = '84L2Z4B99Q';

export const APPLE_APP_SITE_ASSOCIATION = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: `${APPLE_TEAM_ID}.com.gramorx.portal`,
        paths: [...UNIVERSAL_LINK_PATHS],
      },
      {
        appID: `${APPLE_TEAM_ID}.com.gramorx.portal.beta`,
        paths: [...UNIVERSAL_LINK_PATHS],
      },
    ],
  },
} as const;

