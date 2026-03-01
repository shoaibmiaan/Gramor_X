import type { NextApiResponse } from 'next';
import { serialize } from 'cookie';

const isProd = process.env.NODE_ENV === 'production';

export type AuthCookiePayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
  expiresIn?: number | null;
};

function append(res: NextApiResponse, cookie: string) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [cookie]);
    return;
  }
  const next = Array.isArray(existing) ? existing.map(String) : [String(existing)];
  next.push(cookie);
  res.setHeader('Set-Cookie', next);
}

export function setAuthCookies(res: NextApiResponse, payload: AuthCookiePayload) {
  const common = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };

  append(
    res,
    serialize('sb-access-token', payload.accessToken, {
      ...common,
      ...(payload.expiresAt ? { expires: new Date(payload.expiresAt * 1000) } : {}),
      ...(payload.expiresIn ? { maxAge: payload.expiresIn } : {}),
    }),
  );

  append(
    res,
    serialize('sb-refresh-token', payload.refreshToken, {
      ...common,
      maxAge: 60 * 60 * 24 * 30,
    }),
  );
}

export function clearAuthCookies(res: NextApiResponse) {
  const names = ['sb-access-token', 'sb-refresh-token', 'sb:token', 'supabase-auth-token'];
  for (const name of names) {
    append(
      res,
      serialize(name, '', {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }),
    );
  }
}
