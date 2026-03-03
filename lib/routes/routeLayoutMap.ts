// lib/routes/routeLayoutMap.ts

export type LayoutType =
  | 'default'
  | 'admin'
  | 'dashboard'
  | 'profile'
  | 'billing'
  | 'analytics'
  | 'learning'
  | 'resources'
  | 'community'
  | 'communication'
  | 'reports'
  | 'marketplace'
  | 'institutions'
  | 'marketing'
  | 'support'
  | 'auth'
  | 'proctoring';

export interface RouteConfig {
  layout?: LayoutType;
  showChrome?: boolean;
  requiresAuth?: boolean;
  allowedRoles?: string[];
}

export const ROUTE_LAYOUT_MAP: Record<string, RouteConfig> = {
  // ----- AUTH (route shell = auth, chrome hidden) -----
  '/auth': { layout: 'auth', showChrome: false },
  '/auth/callback': { layout: 'auth', showChrome: false },
  '/auth/forgot': { layout: 'auth', showChrome: false },
  '/auth/reset': { layout: 'auth', showChrome: false },
  '/auth/mfa': { layout: 'auth', showChrome: false },

  '/login': { layout: 'auth', showChrome: false },
  '/login/index': { layout: 'auth', showChrome: false },
  '/login/email': { layout: 'auth', showChrome: false },
  '/login/password': { layout: 'auth', showChrome: false },
  '/login/phone': { layout: 'auth', showChrome: false },

  '/signup': { layout: 'auth', showChrome: false },
  '/signup/index': { layout: 'auth', showChrome: false },
  '/signup/email': { layout: 'auth', showChrome: false },
  '/signup/password': { layout: 'auth', showChrome: false },
  '/signup/phone': { layout: 'auth', showChrome: false },
  '/signup/verify': { layout: 'auth', showChrome: false },

  '/forgot-password': { layout: 'auth', showChrome: false },
  '/update-password': { layout: 'auth', showChrome: false },

  // ----- ADMIN -----
  '/admin': { layout: 'admin', showChrome: true, requiresAuth: true },
  '/admin/[section]': { layout: 'admin', showChrome: true, requiresAuth: true },
  '/admin/[section]/[id]': { layout: 'admin', showChrome: true, requiresAuth: true },

  // ----- DASHBOARD / ACCOUNT -----
  '/dashboard': { layout: 'dashboard', showChrome: true, requiresAuth: true },
  '/dashboard/[section]': { layout: 'dashboard', showChrome: true, requiresAuth: true },
  '/dashboard/[section]/[id]': { layout: 'dashboard', showChrome: true, requiresAuth: true },

  '/profile': { layout: 'profile', showChrome: true, requiresAuth: true },
  '/profile/[section]': { layout: 'profile', showChrome: true, requiresAuth: true },
  '/profile/[section]/[id]': { layout: 'profile', showChrome: true, requiresAuth: true },

  '/settings': { layout: 'billing', showChrome: true, requiresAuth: true },
  '/settings/[section]': { layout: 'billing', showChrome: true, requiresAuth: true },
  '/settings/[section]/[id]': { layout: 'billing', showChrome: true, requiresAuth: true },

  '/billing': { layout: 'billing', showChrome: true, requiresAuth: true },
  '/billing/[section]': { layout: 'billing', showChrome: true, requiresAuth: true },

  '/analytics': { layout: 'analytics', showChrome: true, requiresAuth: true },
  '/analytics/[section]': { layout: 'analytics', showChrome: true, requiresAuth: true },

  // ----- LEARNING / RESOURCES -----
  '/learn': { layout: 'learning', showChrome: true },
  '/learn/[section]': { layout: 'learning', showChrome: true },
  '/learn/[section]/[id]': { layout: 'learning', showChrome: true },

  '/learning': { layout: 'learning', showChrome: true },
  '/learning/[section]': { layout: 'learning', showChrome: true },
  '/learning/[section]/[id]': { layout: 'learning', showChrome: true },

  '/writing/resources': { layout: 'resources', showChrome: true },
  '/resources': { layout: 'resources', showChrome: true },
  '/resources/[section]': { layout: 'resources', showChrome: true },

  // ----- COMMUNITY / COMMUNICATION -----
  '/community': { layout: 'community', showChrome: true },
  '/community/[section]': { layout: 'community', showChrome: true },
  '/community/[section]/[id]': { layout: 'community', showChrome: true },

  '/notifications': { layout: 'communication', showChrome: true, requiresAuth: true },
  '/messages': { layout: 'communication', showChrome: true, requiresAuth: true },

  // ----- REPORTS / B2B / MARKETPLACE -----
  '/reports': { layout: 'reports', showChrome: true, requiresAuth: true },
  '/reports/[section]': { layout: 'reports', showChrome: true, requiresAuth: true },

  '/marketplace': { layout: 'marketplace', showChrome: true },
  '/marketplace/[section]': { layout: 'marketplace', showChrome: true },

  '/institutions': { layout: 'institutions', showChrome: true, requiresAuth: true },
  '/institutions/[orgId]': { layout: 'institutions', showChrome: true, requiresAuth: true },
  '/institutions/[orgId]/[section]': { layout: 'institutions', showChrome: true, requiresAuth: true },

  // ----- MARKETING / SUPPORT -----
  '/pricing': { layout: 'marketing', showChrome: true },
  '/blog': { layout: 'marketing', showChrome: true },
  '/support': { layout: 'support', showChrome: true },
  '/legal': { layout: 'support', showChrome: true },

  // ----- MOCK / WRITING / EXAM (shell + attempt pages) -----
  '/mock': { layout: 'learning', showChrome: true },
  '/mock/index': { layout: 'learning', showChrome: true },
  '/mock/[section]': { layout: 'learning', showChrome: true },
  '/mock/[section]/[id]': { layout: 'learning', showChrome: false },
  '/mock/reading/[slug]': { layout: 'learning', showChrome: false },
  '/mock/reading/[slug]/result': { layout: 'learning', showChrome: false },
  '/mock/reading/review/[attemptId]': { layout: 'learning', showChrome: false },

  '/writing': { layout: 'learning', showChrome: true },
  '/writing/[section]': { layout: 'learning', showChrome: true },
  '/writing/[section]/[id]': { layout: 'learning', showChrome: false },
  '/writing/mock': { layout: 'learning', showChrome: true },
  '/writing/mock/[id]': { layout: 'learning', showChrome: false },
  '/writing/mock/[mockId]/start': { layout: 'learning', showChrome: false },
  '/writing/mock/[mockId]/workspace': { layout: 'learning', showChrome: false },

  '/exam': { layout: 'learning', showChrome: true },
  '/exam/rehearsal': { layout: 'learning', showChrome: true },
  '/exam/[id]': { layout: 'learning', showChrome: false },

  // ----- PROCTORING (dedicated shell, chrome hidden) -----
  '/proctoring': { layout: 'proctoring', showChrome: false },
  '/proctoring/check': { layout: 'proctoring', showChrome: false },
  '/proctoring/exam': { layout: 'proctoring', showChrome: false },

  // ----- PREMIUM ROOM (chrome hidden) -----
  '/premium': { layout: 'default', showChrome: false },
  '/premium/index': { layout: 'default', showChrome: false },
  '/premium/room': { layout: 'default', showChrome: false },
  '/premium/pin': { layout: 'default', showChrome: false },
  '/premium/PremiumExamPage': { layout: 'default', showChrome: false },

  // ----- PWA (chrome hidden) -----
  '/pwa': { layout: 'default', showChrome: false },
  '/pwa/app': { layout: 'default', showChrome: false },

  // ----- SYSTEM PAGES -----
  '/403': { layout: 'default', showChrome: true },
  '/404': { layout: 'default', showChrome: true },
  '/500': { layout: 'default', showChrome: true },
};

export function getRouteConfig(pathname: string): RouteConfig {
  if (ROUTE_LAYOUT_MAP[pathname]) return ROUTE_LAYOUT_MAP[pathname];

  for (const [pattern, config] of Object.entries(ROUTE_LAYOUT_MAP)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      const regexPattern = pattern
        .replace(/\[([^\]]+)\]/g, '([^/]+)')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(pathname)) return config;
    }
  }

  const matchingPrefix = Object.keys(ROUTE_LAYOUT_MAP)
    .filter(k => !k.includes('['))
    .sort((a, b) => b.length - a.length)
    .find(k => pathname.startsWith(k));

  if (matchingPrefix) return ROUTE_LAYOUT_MAP[matchingPrefix];

  return { layout: 'default', showChrome: true };
}

export function isAttemptPath(pathname: string): boolean {
  const cfg = getRouteConfig(pathname);
  if (cfg.showChrome === false) return true;

  if (/^\/exam\/[^/]+$/.test(pathname)) return true;
  if (/^\/writing\/mock\/[^/]+(\/workspace|\/start)?$/.test(pathname)) return true;

  return false;
}
