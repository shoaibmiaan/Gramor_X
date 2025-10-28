// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

// Pages that should be accessible without being logged in
const AUTH_PAGES = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/auth/login',
  '/auth/signup',
  '/auth/register',
  '/auth/mfa',
  '/auth/verify',
];

// Prefixes that require auth (your existing list)
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/account',
  '/settings',
  '/notifications',
  '/study-plan',
  '/progress',
  '/leaderboard',
  '/mistakes',

  '/premium',
  '/premium-pin',

  '/mock',
  '/listening',
  '/reading',
  '/writing',
  '/speaking',

  '/proctoring',
  '/exam',
  '/reports',
  '/teacher',
  '/admin',
  '/institutions',
  '/marketplace',
];

function pathStartsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// ensure refreshed cookies from Supabase are preserved when redirecting
function redirectWithCookies(from: NextResponse, url: URL) {
  const r = NextResponse.redirect(url);
  // copy any cookies written to `from` (e.g., refreshed tokens) into the redirect
  for (const c of from.cookies.getAll()) r.cookies.set(c);
  return r;
}

type AuthState =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      userId: string;
      role: string | null;
      onboardingComplete: boolean;
    };

async function loadAuthState(req: NextRequest, res: NextResponse): Promise<AuthState> {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) {
    return { authenticated: false };
  }

  try {
    const response = await fetch(`${req.nextUrl.origin}/api/internal/auth/state`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        'x-gramor-internal': 'middleware',
      },
      cache: 'no-store',
    });

    const headerAccessor = response.headers as unknown as { getSetCookie?: () => string[] };
    const setCookies = headerAccessor.getSetCookie?.();
    if (Array.isArray(setCookies)) {
      setCookies.forEach((cookieValue) => {
        res.headers.append('set-cookie', cookieValue);
      });
    }

    if (!response.ok) {
      return { authenticated: false };
    }

    const json = (await response.json()) as AuthState | { error: string };
    if ('authenticated' in json) {
      return json;
    }
  } catch {
    // Ignore network errors and treat as unauthenticated; downstream guards will handle fallbacks.
  }

  return { authenticated: false };
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip static and API routes (we only guard real pages)
  if (
    pathname.startsWith('/_next') || // includes /_next/data prefetches
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/images') ||
    pathname === '/premium.css' || // allow premium stylesheet
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const authState = await loadAuthState(req, res);

  const isAuthPage = pathStartsWithAny(pathname, AUTH_PAGES);
  const isProtected = pathStartsWithAny(pathname, PROTECTED_PREFIXES);
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');

  // ----- Premium PIN gate (takes precedence over generic auth) -----
  const isPremiumSection = pathname.startsWith('/premium');
  const isPremiumPinPage = pathname === '/premium/pin' || pathname === '/premium-pin';
  const pinOk = req.cookies.get('pr_pin_ok')?.value === '1';

  if (isPremiumSection) {
    // If on PIN page and cookie is already set -> send to intended target or /premium
    if (isPremiumPinPage && pinOk) {
      const url = req.nextUrl.clone();
      const nextParam = req.nextUrl.searchParams.get('next');
      url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/premium';
      url.search = '';
      return redirectWithCookies(res, url);
    }

    // Always allow the PIN entry page if no cookie yet
    if (isPremiumPinPage) return res;

    // For any other /premium path, require the cookie
    if (!pinOk) {
      const url = req.nextUrl.clone();
      url.pathname = '/premium/pin';
      url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
      return redirectWithCookies(res, url);
    }

    // PIN valid → allow without forcing login
    return res;
  }
  // ----- end Premium PIN gate -----

  // If not signed in and trying to view a protected route -> redirect to login
  if (!authState.authenticated && isProtected && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
    return redirectWithCookies(res, url);
  }

  // If already signed in and on an auth page -> bounce to intended next or home
  if (authState.authenticated && isAuthPage) {
    const url = req.nextUrl.clone();
    const nextParam = req.nextUrl.searchParams.get('next');
    url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/';
    url.search = '';
    return redirectWithCookies(res, url);
  }

  if (authState.authenticated) {
    const role = authState.role ?? undefined;
    const skipOnboardingGuard = role === 'teacher' || role === 'admin';

    if (!skipOnboardingGuard) {
      if (!authState.onboardingComplete) {
        if (!isOnboardingRoute && (isProtected || pathname === '/dashboard')) {
          const url = req.nextUrl.clone();
          url.pathname = '/onboarding';
          url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
          return redirectWithCookies(res, url);
        }
      } else if (isOnboardingRoute) {
        const url = req.nextUrl.clone();
        const nextParam = req.nextUrl.searchParams.get('next');
        url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard';
        url.search = '';
        return redirectWithCookies(res, url);
      }
    }
  }

  // Otherwise continue (with any refreshed cookies attached)
  return res;
}

// Apply to all pages except excluded above
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public|api).*)',
  ],
};
