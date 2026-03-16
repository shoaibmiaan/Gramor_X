const CANONICAL_CASE_PATHS = new Map<string, string>([
  ['/welcome', '/welcome'],
  ['/onboarding/welcome', '/onboarding/welcome'],
  ['/dashboard', '/dashboard'],
  ['/login', '/login'],
  ['/signup', '/signup'],
]);

function decodePossiblyEncodedPath(raw: string): string {
  let value = raw.trim();
  for (let i = 0; i < 2; i += 1) {
    if (!value.includes('%')) break;
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

export function sanitizeInternalNextPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const decoded = decodePossiblyEncodedPath(raw);
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;

  let parsed: URL;
  try {
    parsed = new URL(decoded, 'http://localhost');
  } catch {
    return null;
  }

  const pathname = CANONICAL_CASE_PATHS.get(parsed.pathname.toLowerCase()) ?? parsed.pathname;
  return `${pathname}${parsed.search}${parsed.hash}`;
}
