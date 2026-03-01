import type { NextApiRequest, NextApiResponse } from 'next';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getOriginFromHeader(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function requestOrigin(req: NextApiRequest): string | null {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin) {
    return getOriginFromHeader(origin);
  }

  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer) {
    return getOriginFromHeader(referer);
  }

  return null;
}

function expectedOrigin(req: NextApiRequest): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // ignore bad env
    }
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https';
  if (!host || typeof host !== 'string') return null;
  return `${proto}://${host}`;
}

export function assertSameOrigin(req: NextApiRequest): { ok: true } | { ok: false; error: string } {
  if (SAFE_METHODS.has(req.method || 'GET')) return { ok: true };

  const expected = expectedOrigin(req);
  const actual = requestOrigin(req);

  if (!expected || !actual) {
    return { ok: false, error: 'csrf_origin_missing' };
  }

  if (expected !== actual) {
    return { ok: false, error: 'csrf_origin_mismatch' };
  }

  return { ok: true };
}

export function enforceSameOrigin(
  req: NextApiRequest,
  res: NextApiResponse,
): boolean {
  const result = assertSameOrigin(req);
  if (!result.ok) {
    res.status(403).json({ error: 'Forbidden', reason: result.error });
    return false;
  }
  return true;
}
