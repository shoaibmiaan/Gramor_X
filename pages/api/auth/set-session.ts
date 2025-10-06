// pages/api/auth/set-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

type SupabaseSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
};

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  path?: string;
  maxAge?: number;
  expires?: Date;
};

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.path) segments.push(`Path=${options.path}`);
  if (typeof options.maxAge === 'number') segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) segments.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) segments.push('HttpOnly');
  if (options.secure) segments.push('Secure');
  if (options.sameSite) {
    const normalized = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
    segments.push(`SameSite=${normalized}`);
  }
  return segments.join('; ');
}

function appendSetCookie(res: NextApiResponse, value: string) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', value);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, value]);
    return;
  }

  res.setHeader('Set-Cookie', [existing as string, value]);
}

function writeSessionCookies(res: NextApiResponse, session: SupabaseSession | null | undefined) {
  if (!session || !session.access_token) return false;

  const secure = process.env.NODE_ENV === 'production';
  const baseOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };

  const maxAge = typeof session.expires_in === 'number' ? session.expires_in : undefined;
  appendSetCookie(
    res,
    serializeCookie('sb-access-token', session.access_token, {
      ...baseOptions,
      ...(typeof maxAge === 'number' ? { maxAge } : {}),
      ...(session.expires_at ? { expires: new Date(session.expires_at * 1000) } : {}),
    }),
  );

  if (session.refresh_token) {
    appendSetCookie(
      res,
      serializeCookie('sb-refresh-token', session.refresh_token, {
        ...baseOptions,
        // refresh tokens are typically long-lived; fall back to 30 days if no expiry provided
        maxAge: session.expires_in ?? 60 * 60 * 24 * 30,
      }),
    );
  }

  return true;
}

function clearSessionCookies(res: NextApiResponse) {
  const secure = process.env.NODE_ENV === 'production';
  ['sb-access-token', 'sb-refresh-token'].forEach((name) => {
    appendSetCookie(
      res,
      serializeCookie(name, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure,
      }),
    );
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  let supabase;
  try {
    supabase = createPagesServerClient({ req, res });
  } catch (error) {
    console.error('Set-session API - Supabase client creation failed:', error);
    return res.status(503).json({ ok: false, error: 'service_unavailable' });
  }

  const { event, session } = req.body as { event: string; session: SupabaseSession | null };

  try {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (typeof supabase.auth.setSession === 'function') {
        // writes sb-access-token / sb-refresh-token cookies when available
        await supabase.auth.setSession(session as any);
      } else {
        writeSessionCookies(res, session);
      }
      return res.status(200).json({ ok: true });
    }
    if (event === 'SIGNED_OUT') {
      if (typeof supabase.auth.signOut === 'function') {
        await supabase.auth.signOut();
      } else {
        clearSessionCookies(res);
      }
      return res.status(200).json({ ok: true });
    }
    // No-op for other events
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Set-session API - Session operation failed:', e);
    return res.status(200).json({ ok: false });
  }
}