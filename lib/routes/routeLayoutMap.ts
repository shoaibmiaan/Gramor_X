// lib/routes/routeLayoutMap.ts

// We no longer auto-apply per-page layouts.
// One layout only: 'default' (Header + Footer). Use showChrome=false to hide chrome on certain pages.
export type LayoutType = 'default';

export interface RouteConfig {
  layout?: LayoutType;       // kept for compatibility; always 'default'
  showChrome?: boolean;      // default true unless explicitly false
  requiresAuth?: boolean;    // auth flags kept if your guards rely on them
  allowedRoles?: string[];   // optional role hints (unused by layout)
}

// ===== MINIMAL ROUTE MAP (only exceptions & special shells) =====
export const ROUTE_LAYOUT_MAP: Record<string, RouteConfig> = {
  // ----- AUTH (usually no header/footer) -----
  '/auth': { layout: 'default', showChrome: false },
  '/auth/callback': { layout: 'default', showChrome: false },
  '/auth/forgot': { layout: 'default', showChrome: false },
  '/auth/reset': { layout: 'default', showChrome: false },
  '/auth/mfa': { layout: 'default', showChrome: false },
  '/auth/verify': { layout: 'default', showChrome: false },

  '/login': { layout: 'default', showChrome: false },
  '/login/index': { layout: 'default', showChrome: false },
  '/login/email': { layout: 'default', showChrome: false },
  '/login/password': { layout: 'default', showChrome: false },
  '/login/phone': { layout: 'default', showChrome: false },

  '/signup': { layout: 'default', showChrome: false },
  '/signup/index': { layout: 'default', showChrome: false },
  '/signup/email': { layout: 'default', showChrome: false },
  '/signup/password': { layout: 'default', showChrome: false },
  '/signup/phone': { layout: 'default', showChrome: false },
  '/signup/verify': { layout: 'default', showChrome: false },

  '/forgot-password': { layout: 'default', showChrome: false },
  '/update-password': { layout: 'default', showChrome: false },

  // ----- MOCK / EXAM SHELLS -----
  // Shells show chrome; attempt/workspace pages hide it.
  '/mock': { layout: 'default', showChrome: true },
  '/mock/index': { layout: 'default', showChrome: true },
  '/mock/[section]': { layout: 'default', showChrome: true },
  '/mock/reading/[slug]': { layout: 'default', showChrome: false },
  '/mock/reading/[slug]/result': { layout: 'default', showChrome: false },
  '/mock/reading/review/[attemptId]': { layout: 'default', showChrome: false },

  '/writing/mock': { layout: 'default', showChrome: true },
  '/writing/mock/[id]': { layout: 'default', showChrome: false },
  '/writing/mock/[mockId]/start': { layout: 'default', showChrome: false },
  '/writing/mock/[mockId]/workspace': { layout: 'default', showChrome: false },

  '/learn/listening': { layout: 'default', showChrome: true },


  // Writing resources (ensure _app wraps with default layout + chrome)
  '/writing/resources': { layout: 'default', showChrome: true },

  // Exam routes
  '/exam': { layout: 'default', showChrome: true },
  '/exam/rehearsal': { layout: 'default', showChrome: true },
  '/exam/[id]': { layout: 'default', showChrome: false },

  // ----- PROCTORING (no chrome) -----
  '/proctoring/check': { layout: 'default', showChrome: false },
  '/proctoring/exam': { layout: 'default', showChrome: false },

  // ----- PREMIUM ROOM (no chrome) -----
  '/premium': { layout: 'default', showChrome: false },
  '/premium/index': { layout: 'default', showChrome: false },
  '/premium/room': { layout: 'default', showChrome: false },
  '/premium/pin': { layout: 'default', showChrome: false },
  '/premium/PremiumExamPage': { layout: 'default', showChrome: false },

  // ----- PWA (no chrome) -----
  '/pwa': { layout: 'default', showChrome: false },
  '/pwa/app': { layout: 'default', showChrome: false },

  // ----- SYSTEM PAGES (show chrome by default) -----
  '/403': { layout: 'default', showChrome: true },
  '/404': { layout: 'default', showChrome: true },
  '/500': { layout: 'default', showChrome: true },
};

// ---- Helpers ----
export function getRouteConfig(pathname: string): RouteConfig {
  // Exact match
  if (ROUTE_LAYOUT_MAP[pathname]) return ROUTE_LAYOUT_MAP[pathname];

  // Dynamic patterns e.g. /foo/[id]
  for (const [pattern, config] of Object.entries(ROUTE_LAYOUT_MAP)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      const regexPattern = pattern
        .replace(/\[([^\]]+)\]/g, '([^/]+)')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(pathname)) return config;
    }
  }

  // Longest static prefix fallback
  const matchingPrefix = Object.keys(ROUTE_LAYOUT_MAP)
    .filter(k => !k.includes('['))
    .sort((a, b) => b.length - a.length)
    .find(k => pathname.startsWith(k));

  if (matchingPrefix) return ROUTE_LAYOUT_MAP[matchingPrefix];

  // Default: chrome on, single layout
  return { layout: 'default', showChrome: true };
}

export function isAttemptPath(pathname: string): boolean {
  // If a route explicitly hides chrome, treat as attempt
  const cfg = getRouteConfig(pathname);
  if (cfg.showChrome === false) return true;

  // Heuristics for common attempt URLs (kept for safety)
  if (/^\/exam\/[^/]+$/.test(pathname)) return true;
  if (/^\/writing\/mock\/[^/]+(\/workspace|\/start)?$/.test(pathname)) return true;

  return false;
}
