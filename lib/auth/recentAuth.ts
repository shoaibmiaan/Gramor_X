import type { NextApiRequest } from 'next';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const text = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickAuthCookie(req: NextApiRequest): string | null {
  const direct = req.cookies['sb-access-token'];
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const dynamicKey = Object.keys(req.cookies).find((name) =>
    /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name),
  );

  if (!dynamicKey) return null;
  const raw = req.cookies[dynamicKey];
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as
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

export function isRecentAuthentication(req: NextApiRequest, maxAgeSeconds = 900): boolean {
  const token = pickAuthCookie(req);
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  const authTime =
    typeof payload.auth_time === 'number'
      ? payload.auth_time
      : typeof payload.iat === 'number'
        ? payload.iat
        : null;

  if (!authTime) return false;
  return now - authTime <= maxAgeSeconds;
}
