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
  '/auth/confirm', // ← must be here
  '/auth/callback',
];

// Prefixes that require auth – added '/profile'
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/account',
  '/settings',
  '/profile', // <-- ADDED
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

function redirectWithCookies(from: NextResponse, url: URL) {
  const r = NextResponse.redirect(url);
  for (const c of from.cookies.getAll()) r.cookies.set(c);
  return r;
}

type AuthState =
  | { authenticated: false }
  | {
      authenticated: true;
      userId: string;
      role: string | null;
      onboardingComplete: boolean;
    };

async function loadAuthState(req: NextRequest, res: NextResponse): Promise<AuthState> {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return { authenticated: false };

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

    if (!response.ok) return { authenticated: false };

    const json = (await response.json()) as AuthState | { error: string };
    if ('authenticated' in json) return json;
  } catch {
    // ignore
  }

  return { authenticated: false };
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip static, api, assets etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/images') ||
    pathname === '/premium.css' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // ────────────────────────────────────────────────────────────────
  // VERY IMPORTANT: Allow /auth/confirm unconditionally (with query params)
  // Put this as early as possible – before any auth or protected logic
  // ────────────────────────────────────────────────────────────────
  if (
    pathname === '/auth/confirm' ||
    pathname.startsWith('/auth/confirm/') ||
    pathname.startsWith('/auth/confirm?')
  ) {
    console.log('[middleware] Allowing /auth/confirm (verification bypass)');
    return NextResponse.next();
  }

  // Also allow callback (for OAuth/magic links)
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback?')) {
    console.log('[middleware] Allowing /auth/callback');
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const authState = await loadAuthState(req, res);

  const isAuthPage = pathStartsWithAny(pathname, AUTH_PAGES);
  const isProtected = pathStartsWithAny(pathname, PROTECTED_PREFIXES);
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');

  // Premium PIN gate (unchanged – still valid for premium content protection)
  const isPremiumSection = pathname.startsWith('/premium');
  const isPremiumPinPage = pathname === '/premium/pin' || pathname === '/premium-pin';
  const pinOk = req.cookies.get('pr_pin_ok')?.value === '1';

  if (isPremiumSection) {
    if (isPremiumPinPage && pinOk) {
      const url = req.nextUrl.clone();
      const nextParam = req.nextUrl.searchParams.get('next');
      url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/premium';
      url.search = '';
      return redirectWithCookies(res, url);
    }

    if (isPremiumPinPage) return res;

    if (!pinOk) {
      const url = req.nextUrl.clone();
      url.pathname = '/premium/pin';
      url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
      return redirectWithCookies(res, url);
    }

    return res;
  }

  // Redirect unauthenticated users from protected routes
  if (!authState.authenticated && isProtected && !isAuthPage) {
    console.log('[middleware] Redirecting to login from:', pathname);
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + (search || ''))}&role=student`;
    return redirectWithCookies(res, url);
  }

  // If logged in and on auth page → redirect away
  if (authState.authenticated && isAuthPage) {
    const url = req.nextUrl.clone();
    const nextParam = req.nextUrl.searchParams.get('next');
    url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/';
    url.search = '';
    return redirectWithCookies(res, url);
  }

  // Prevent teacher/admin users from entering student onboarding routes.
  if (authState.authenticated) {
    const role = authState.role;
    const isPrivilegedRole = role === 'teacher' || role === 'admin';
    const isStudentOnboardingRoute =
      pathname === '/onboarding' ||
      (pathname.startsWith('/onboarding/') && !pathname.startsWith('/onboarding/teacher'));

    if (isPrivilegedRole && isStudentOnboardingRoute) {
      const url = req.nextUrl.clone();
      url.pathname = role === 'teacher' ? '/teacher' : '/admin';
      url.search = '';
      return redirectWithCookies(res, url);
    }
  }

  // Onboarding guard
  if (authState.authenticated) {
    const role = authState.role ?? undefined;
    const skipOnboardingGuard = role === 'teacher' || role === 'admin';

    if (!skipOnboardingGuard && !authState.onboardingComplete) {
      if (!isOnboardingRoute && (isProtected || pathname === '/dashboard')) {
        const url = req.nextUrl.clone();
        url.pathname = '/welcome';
        url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
        return redirectWithCookies(res, url);
      }
    } else if (isOnboardingRoute && authState.onboardingComplete) {
      const url = req.nextUrl.clone();
      const nextParam = req.nextUrl.searchParams.get('next');
      url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard';
      url.search = '';
      return redirectWithCookies(res, url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public|api).*)',
  ],
};
