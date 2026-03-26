import { NextResponse, type NextRequest } from 'next/server';

import { getMiddlewareClient } from '@/lib/supabaseServer';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
] as const;

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/ai',
  '/writing',
  '/reading',
  '/listening',
  '/speaking',
  '/vocabulary',
  '/progress',
  '/study-plan',
  '/billing',
  '/me',
  '/account',
  '/admin',
  '/teacher',
  '/mock',
  '/premium',
  '/onboarding',
] as const;

const PUBLIC_API_PREFIXES = [
  '/api/auth',
  '/api/healthz',
  '/api/metrics',
  '/api/waitlist',
  '/api/webhooks',
  '/api/cron',
  '/api/internal/auth/state',
] as const;

const PROTECTED_API_PREFIXES = ['/api'] as const;

const ROLE_PREFIXES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/teacher', roles: ['teacher', 'admin'] },
];

const STATIC_PREFIXES = ['/_next', '/assets', '/public', '/images'] as const;
const STATIC_FILES = ['/premium.css', '/favicon.ico', '/robots.txt', '/sitemap.xml'] as const;

function isExactOrPrefixed(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => isExactOrPrefixed(pathname, prefix));
}

function isPublicPage(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => isExactOrPrefixed(pathname, prefix));
}

function roleRequirementForPath(pathname: string): string[] | null {
  const match = ROLE_PREFIXES.find(({ prefix }) => isExactOrPrefixed(pathname, prefix));
  return match?.roles ?? null;
}

async function getAuthContext(req: NextRequest, res: NextResponse) {
  const supabase = getMiddlewareClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    user,
    isAuthenticated: !!user,
    role: typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role : null,
  };
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (matchesAny(pathname, STATIC_PREFIXES) || STATIC_FILES.includes(pathname as (typeof STATIC_FILES)[number])) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const { isAuthenticated, role } = await getAuthContext(req, res);

  const isApiRoute = pathname.startsWith('/api');
  const isProtectedPage = matchesAny(pathname, PROTECTED_PREFIXES);
  const isProtectedApi = matchesAny(pathname, PROTECTED_API_PREFIXES) && !isPublicApi(pathname);
  const isProtected = isApiRoute ? isProtectedApi : isProtectedPage;

  console.log('[middleware:auth]', {
    pathname,
    isProtected,
    isAuthenticated,
  });

  if (!isApiRoute && isPublicPage(pathname)) {
    return res;
  }

  if (!isAuthenticated && isProtected) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
    return NextResponse.redirect(loginUrl);
  }

  if (!isApiRoute && isAuthenticated && isPublicPage(pathname) && pathname !== '/') {
    const nextParam = req.nextUrl.searchParams.get('next');
    if (pathname === '/login' || pathname === '/signup') {
      const destination = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard';
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = destination;
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!isApiRoute && isAuthenticated) {
    const allowedRoles = roleRequirementForPath(pathname);
    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
      const restrictedUrl = req.nextUrl.clone();
      restrictedUrl.pathname = '/restricted';
      restrictedUrl.search = '';
      return NextResponse.redirect(restrictedUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
