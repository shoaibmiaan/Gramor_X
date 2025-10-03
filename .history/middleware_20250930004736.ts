// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

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

// Prefixes that must be authenticated (includes premium & exam routes)
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

export async function middleware(req: NextRequest) {
  // Skip static files and all API routes (we only guard pages)
  const { pathname, search } = req.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/api/') // important: do not guard API routes
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get/refresh the session so cookies are available to the edge runtime
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = pathStartsWithAny(pathname, AUTH_PAGES);
  const isProtected = pathStartsWithAny(pathname, PROTECTED_PREFIXES);

  // If not signed in and trying to view a protected route -> redirect to login
  if (!session && isProtected && !isAuthPage) {
    const next = encodeURIComponent(pathname + (search || ''));
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${next}`;
    return NextResponse.redirect(url);
  }

  // If already signed in and hitting an auth page, send them to their intended next/home
  if (session && isAuthPage) {
    const url = req.nextUrl.clone();
    const nextParam = req.nextUrl.searchParams.get('next');
    url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Otherwise continue
  return res;
}

// Apply to all pages except excluded above
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public|api).*)'],
};
