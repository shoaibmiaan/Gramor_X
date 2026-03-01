import { NextResponse, type NextRequest } from 'next/server';

const AUTH_PAGES = ['/login', '/signup', '/register', '/forgot-password', '/auth/callback'];

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

function isSafePostAuthRedirect(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false;
  if (pathStartsWithAny(path, AUTH_PAGES)) return false;
  return true;
}

function hasAuthCookie(req: NextRequest) {
  const accessToken = req.cookies.get('sb-access-token')?.value;
  const refreshToken = req.cookies.get('sb-refresh-token')?.value;
  if (accessToken && refreshToken) return true;

  const legacyToken = req.cookies.get('sb:token')?.value || req.cookies.get('supabase-auth-token')?.value;
  if (legacyToken) return true;

  const projectScopedToken = req.cookies
    .getAll()
    .some((cookie) => /^sb-[a-z0-9-]+-auth-token(?:\.0)?$/i.test(cookie.name) && Boolean(cookie.value));

  return projectScopedToken;
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
  const isAuthPage = pathStartsWithAny(pathname, AUTH_PAGES);
  const isProtected = pathStartsWithAny(pathname, PROTECTED_PREFIXES);

  if (!authed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
    return NextResponse.redirect(url);
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public|api).*)'],
};
