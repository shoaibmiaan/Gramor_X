const AUTH_ROUTE_PATTERNS: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/register(\/|$)/,
  /^\/forgot-password(\/|$)/,
  /^\/auth\/(login|signup|register|mfa|forgot|reset|callback)(\/|$)/,
];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isSafePostAuthRedirect(path: string | null): boolean {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false;
  return !isAuthRoute(path);
}

export function createLoginDestination(resolvedUrl?: string): string {
  if (!resolvedUrl || resolvedUrl === '/') return '/login';
  return `/login?next=${encodeURIComponent(resolvedUrl)}`;
}
