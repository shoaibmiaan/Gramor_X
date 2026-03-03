export type LayoutType =
  | 'default'
  | 'auth'
  | 'admin'
  | 'institutions'
  | 'dashboard'
  | 'marketplace'
  | 'learning'
  | 'community'
  | 'reports'
  | 'marketing'
  | 'profile'
  | 'communication'
  | 'billing'
  | 'resources'
  | 'analytics'
  | 'support'
  | 'proctoring';

export interface RouteConfig {
  layout?: LayoutType;
  showChrome?: boolean;
  requiresAuth?: boolean;
  allowedRoles?: string[];
}

export const ROUTE_LAYOUT_MAP: Record<string, RouteConfig> = {
  '/': { layout: 'marketing', showChrome: true },

  // Auth
  '/auth/callback': { layout: 'auth', showChrome: false },
  '/auth/forgot': { layout: 'auth', showChrome: false },
  '/auth/login': { layout: 'auth', showChrome: false },
  '/auth/mfa': { layout: 'auth', showChrome: false },
  '/auth/reset': { layout: 'auth', showChrome: false },
  '/auth/signup': { layout: 'auth', showChrome: false },
  '/forgot-password': { layout: 'auth', showChrome: false },
  '/update-password': { layout: 'auth', showChrome: false },
  '/login': { layout: 'auth', showChrome: false },
  '/login/email': { layout: 'auth', showChrome: false },
  '/login/password': { layout: 'auth', showChrome: false },
  '/login/phone': { layout: 'auth', showChrome: false },
  '/signup': { layout: 'auth', showChrome: false },
  '/signup/email': { layout: 'auth', showChrome: false },
  '/signup/password': { layout: 'auth', showChrome: false },
  '/signup/phone': { layout: 'auth', showChrome: false },
  '/signup/verify': { layout: 'auth', showChrome: false },

  // Proctoring
  '/proctoring/check': { layout: 'proctoring', showChrome: false },
  '/proctoring/exam/[id]': { layout: 'proctoring', showChrome: false },

  // Intentional no-chrome marketplace surfaces
  '/premium': { layout: 'marketplace', showChrome: false },
  '/premium/PremiumExamPage': { layout: 'marketplace', showChrome: false },
  '/premium/pin': { layout: 'marketplace', showChrome: false },
  '/premium/listening/[slug]': { layout: 'marketplace', showChrome: false },
  '/premium/reading/[slug]': { layout: 'marketplace', showChrome: false },

  // System
  '/403': { layout: 'marketing', showChrome: true },
  '/404': { layout: 'marketing', showChrome: true },
  '/500': { layout: 'marketing', showChrome: true },

  // PWA shell
  '/pwa/app': { layout: 'marketing', showChrome: false },
};

const ROUTE_MATCHERS: Array<{ pattern: RegExp; config: RouteConfig }> = [
  { pattern: /^\/admin(\/|$)/, config: { layout: 'admin', showChrome: true } },
  { pattern: /^(\/institutions(\/|$)|\/orgs$)/, config: { layout: 'institutions', showChrome: true } },
  { pattern: /^\/teacher(\/|$)/, config: { layout: 'dashboard', showChrome: true } },
  { pattern: /^(\/reports(\/|$)|\/analytics(\/|$))/, config: { layout: 'reports', showChrome: true } },
  { pattern: /^(\/marketplace(\/|$)|\/checkout(\/|$)|\/pricing(\/|$)|\/promotions$|\/waitlist$)/, config: { layout: 'marketplace', showChrome: true } },
  { pattern: /^\/community(\/|$)/, config: { layout: 'community', showChrome: true } },
  { pattern: /^(\/profile(\/|$)|\/settings(\/|$)|\/saved$|\/mistakes$|\/roadmap$|\/me\/listening\/saved$)/, config: { layout: 'profile', showChrome: true } },

  // Exam/progression routes with hidden chrome
  { pattern: /^\/mock\/reading\/\[slug\](\/|$)/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/mock\/reading\/(result|review|feedback)(\/|$)/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/mock\/listening\/(\[slug\]|exam|result|review)(\/|$)/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/mock\/writing\/(run|result)(\/|$)/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/mock\/\[section\]$/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/writing\/mock\/\[mockId\]\/(start|workspace|review|results|evaluating)$/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/exam\/\[id\]$/, config: { layout: 'dashboard', showChrome: false } },
  { pattern: /^\/placement\/run$/, config: { layout: 'dashboard', showChrome: false } },

  // Dashboard family
  { pattern: /^(\/dashboard(\/|$)|\/mock(\/|$)|\/practice(\/|$)|\/study-plan(\/|$)|\/progress(\/|$)|\/quick(\/|$)|\/challenge(\/|$)|\/coach(\/|$)|\/onboarding(\/|$)|\/placement(\/|$)|\/predictor(\/|$)|\/notifications$|\/leaderboard$|\/score$|\/exam-day$|\/whatsapp-tasks$|\/tokens-test$|\/restricted$|\/exam\/rehearsal$)/, config: { layout: 'dashboard', showChrome: true } },

  // Learning/resources family
  { pattern: /^(\/learn(\/|$)|\/learning(\/|$)|\/reading(\/|$)|\/listening(\/|$)|\/writing(\/|$)|\/speaking(\/|$)|\/vocabulary(\/|$)|\/review(\/|$)|\/tools(\/|$)|\/cert(\/|$)|\/classes(\/|$)|\/bookings(\/|$)|\/content\/studio(\/|$)|\/internal\/content(\/|$)|\/vocab$|\/word-of-the-day$|\/ai(\/|$)|\/labs\/ai-tutor$)/, config: { layout: 'learning', showChrome: true } },

  // Public marketing/content
  { pattern: /^(\/accessibility$|\/blog(\/|$)|\/data-deletion$|\/developers$|\/faq$|\/legal(\/|$)|\/partners$|\/r\/\[code\]$|\/visa$|\/welcome$)/, config: { layout: 'marketing', showChrome: true } },
];

export function getRouteConfig(pathname: string): RouteConfig {
  if (ROUTE_LAYOUT_MAP[pathname]) return ROUTE_LAYOUT_MAP[pathname];

  for (const [pattern, config] of Object.entries(ROUTE_LAYOUT_MAP)) {
    if (!pattern.includes('[')) continue;
    const regexPattern = pattern
      .replace(/\[([^\]]+)\]/g, '([^/]+)')
      .replace(/\//g, '\\/');
    if (new RegExp(`^${regexPattern}$`).test(pathname)) return config;
  }

  for (const { pattern, config } of ROUTE_MATCHERS) {
    if (pattern.test(pathname)) return config;
  }

  return { layout: 'marketing', showChrome: true };
}

export function isAttemptPath(pathname: string): boolean {
  const cfg = getRouteConfig(pathname);
  return cfg.showChrome === false;
}
