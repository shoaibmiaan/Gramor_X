// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getMiddlewareClient } from '@/lib/supabaseServer';

const AUTH_PAGES = [
  '/login', '/signup', '/register', '/forgot-password',
  '/auth/login', '/auth/signup', '/auth/register', '/auth/mfa', '/auth/verify',
];

const PROTECTED_PREFIXES = [
  '/dashboard', '/account', '/settings', '/notifications',
  '/study-plan', '/progress', '/leaderboard', '/mistakes',
  '/premium', '/premium-pin',
  '/mock', '/listening', '/reading', '/writing', '/speaking',
  '/proctoring', '/exam', '/reports', '/teacher', '/admin', '/institutions', '/marketplace',
];

function pathStartsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectWithCookies(from: NextResponse, url: URL) {
  const r = NextResponse.redirect(url);
  for (const c of from.cookies.getAll()) r.cookies.set(c);
  return r;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // allow static and API
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

  const res = NextResponse.next();
  const supabase = getMiddlewareClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = pathStartsWithAny(pathname, AUTH_PAGES);
  const isProtected = pathStartsWithAny(pathname, PROTECTED_PREFIXES);
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');

  // Premium PIN gate
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

  // Quick metadata hint
  const needsOnboardingMeta = !!user && user.user_metadata?.onboarding_complete === false;

  if (needsOnboardingMeta && !isOnboardingRoute) {
    const url = req.nextUrl.clone();
    url.pathname = '/onboarding';
    url.search = '';
    return redirectWithCookies(res, url);
  }

  // Auth guard
  if (!user && isProtected && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
    return redirectWithCookies(res, url);
  }

  // If signed in and on auth page → go home/next
  if (user && isAuthPage) {
    const url = req.nextUrl.clone();
    const nextParam = req.nextUrl.searchParams.get('next');
    url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/';
    url.search = '';
    return redirectWithCookies(res, url);
  }

  // Robust DB check (non-fatal if it fails)
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_complete,onboarding_step')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const loadFailed = !!profileError && profileError.code !== 'PGRST116';
    if (!loadFailed) {
      const noProfile = profileError?.code === 'PGRST116' || !profile;
      const onboardingComplete = profile?.onboarding_complete === true;

      if (!onboardingComplete) {
        if (!isOnboardingRoute && (isProtected || pathname === '/dashboard')) {
          const url = req.nextUrl.clone();
          url.pathname = '/onboarding';
          url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
          return redirectWithCookies(res, url);
        }
      } else if (isOnboardingRoute && !noProfile) {
        const url = req.nextUrl.clone();
        const nextParam = req.nextUrl.searchParams.get('next');
        url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard';
        url.search = '';
        return redirectWithCookies(res, url);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public|api).*)',
  ],
};
