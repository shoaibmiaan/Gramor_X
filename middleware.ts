import { NextResponse, type NextRequest } from 'next/server';
import { createLoginDestination, isAuthRoute, isSafePostAuthRedirect } from '@/lib/authRedirect';


const PREMIUM_PREFIXES = [
  '/writing/mock',
  '/dashboard/ai-reports',
  '/dashboard/writing',
  '/dashboard/speaking',
  '/speaking',
  '/writing',
];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/account',
  '/profile',
  '/settings',
  '/notifications',
  '/study-plan',
  '/progress',
  '/leaderboard',
  '/mistakes',
  '/premium',
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

function hasAuthCookie(req: NextRequest) {
  const hasDirectPair = Boolean(
    req.cookies.get('sb-access-token')?.value && req.cookies.get('sb-refresh-token')?.value,
  );
  if (hasDirectPair) return true;

  if (req.cookies.get('sb:token')?.value || req.cookies.get('supabase-auth-token')?.value) {
    return true;
  }

  return req.cookies
    .getAll()
    .some((cookie) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(cookie.name));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const text = atob(padded);
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getAccessTokenFromCookie(req: NextRequest): string | null {
  const direct = req.cookies.get('sb-access-token')?.value;
  if (direct) return direct;

  const authCookie = req.cookies
    .getAll()
    .find((cookie) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(cookie.name));

  if (!authCookie?.value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie.value)) as
      | { access_token?: string; currentSession?: { access_token?: string } }
      | [{ access_token?: string }?, { access_token?: string }?]
      | null;

    if (Array.isArray(parsed)) {
      return parsed[0]?.access_token ?? parsed[1]?.access_token ?? null;
    }

    return parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
  } catch {
    return null;
  }
}

function getRoleFromRequest(req: NextRequest): string | null {
  const token = getAccessTokenFromCookie(req);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const appMeta = payload.app_metadata as { role?: unknown } | undefined;
  const userMeta = payload.user_metadata as { role?: unknown } | undefined;
  const role = appMeta?.role ?? userMeta?.role;

  return typeof role === 'string' ? role.toLowerCase() : null;
}


function getPlanFromRequest(req: NextRequest): string | null {
  const token = getAccessTokenFromCookie(req);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const appMeta = payload.app_metadata as { plan?: unknown; tier?: unknown } | undefined;
  const userMeta = payload.user_metadata as { plan?: unknown; tier?: unknown } | undefined;
  const rawPlan = appMeta?.plan ?? userMeta?.plan ?? appMeta?.tier ?? userMeta?.tier;

  if (typeof rawPlan !== 'string') return null;
  const plan = rawPlan.toLowerCase();
  if (plan === 'free' || plan === 'seedling' || plan === 'starter' || plan === 'booster' || plan === 'rocket' || plan === 'master' || plan === 'owl') return plan;
  return null;
}

function hasPremiumAccess(req: NextRequest) {
  const plan = getPlanFromRequest(req);
  return Boolean(plan && plan !== 'free');
}
function hasExpiredSession(req: NextRequest) {
  const token = getAccessTokenFromCookie(req);
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const exp = payload.exp;
  if (typeof exp !== 'number') return false;
  return exp <= Math.floor(Date.now() / 1000);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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

  const authed = hasAuthCookie(req);
  const isAuthPage = isAuthRoute(pathname);
  const isProtected = pathStartsWithAny(pathname, PROTECTED_PREFIXES);

  if (!authed && isProtected) {
    const url = req.nextUrl.clone();
    const destination = createLoginDestination(pathname + (search || ''));
    const [targetPath, query = ''] = destination.split('?');
    url.pathname = targetPath;
    url.search = query ? `?${query}` : '';
    return NextResponse.redirect(url);
  }

  if (authed && isProtected && hasExpiredSession(req)) {
    const url = req.nextUrl.clone();
    const destination = createLoginDestination(pathname + (search || ''));
    const separator = destination.includes('?') ? '&' : '?';
    const withMessage = `${destination}${separator}reason=session_expired`;
    const [targetPath, query = ''] = withMessage.split('?');
    url.pathname = targetPath;
    url.search = query ? `?${query}` : '';
    return NextResponse.redirect(url);
  }

  if (authed && pathname.startsWith('/admin')) {
    const role = getRoleFromRequest(req);
    if (role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/403';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }


  if (authed && pathStartsWithAny(pathname, PREMIUM_PREFIXES) && !hasPremiumAccess(req)) {
    const url = req.nextUrl.clone();
    url.pathname = '/pricing';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (authed && pathname.startsWith('/teacher')) {
    const role = getRoleFromRequest(req);
    if (role !== 'teacher' && role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/403';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (authed && isAuthPage) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.searchParams.get('next');
    url.pathname = isSafePostAuthRedirect(next) ? next! : '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public|api).*)',
  ],
};
