// lib/supabaseSSR.ts
// SSR helper for API routes that need to READ+WRITE Supabase cookies.
// Mirrors the cookie adapter we use in middleware and is safe for localhost.
//
// Notes:
// - Ensures Path=/, SameSite=Lax, HttpOnly by default
// - Trims cookie names on read()
// - Appends multiple Set-Cookie values correctly
// - In dev, Secure=false; in prod, Secure=true (driven by options.secure passed by Supabase)

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const IS_PROD = process.env.NODE_ENV === 'production';

function readCookie(req: NextApiRequest, name: string) {
  const raw = req.headers.cookie ?? '';
  if (!raw) return undefined;
  // Split pairs and trim; handle leading spaces
  const parts = raw.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return undefined;
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts: string[] = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);

  // Enforce safe defaults if not set by caller (Supabase usually sets them, but we guard)
  const path = options.path ?? '/';
  const sameSite = (options.sameSite ?? 'Lax') as Exclude<CookieOptions['sameSite'], undefined>;
  const httpOnly = options.httpOnly ?? true;
  const secure = options.secure ?? IS_PROD; // never secure on http://localhost

  parts.push(`Path=${path}`);
  parts.push(`SameSite=${sameSite}`);
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');

  // Respect explicit domain/expires/maxAge if provided
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.expires) parts.push(`Expires=${(options.expires as Date).toUTCString()}`);
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.floor(options.maxAge)}`);

  return parts.join('; ');
}

function appendSetCookie(res: NextApiResponse, cookie: string) {
  const prev = res.getHeader('Set-Cookie');
  if (!prev) {
    res.setHeader('Set-Cookie', cookie);
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev, cookie]);
  } else {
    res.setHeader('Set-Cookie', [prev as string, cookie]);
  }
}

export function createSSRClient<T = unknown>(req: NextApiRequest, res: NextApiResponse) {
  if (!URL || !ANON) throw new Error('Supabase env missing (URL or ANON)');
  return createServerClient<T>(URL, ANON, {
    cookies: {
      get: (name: string) => readCookie(req, name),
      set: (name: string, value: string, options: CookieOptions = {}) => {
        const cookie = serializeCookie(name, value, options);
        appendSetCookie(res, cookie);
      },
      remove: (name: string, options: CookieOptions = {}) => {
        // Ensure deletion is effective across the app
        const del = serializeCookie(name, '', {
          ...options,
          path: options.path ?? '/',
          sameSite: options.sameSite ?? 'Lax',
          httpOnly: options.httpOnly ?? true,
          maxAge: 0,
          // also add an Expires in the past to satisfy all browsers
          expires: new Date(0),
          secure: options.secure ?? IS_PROD,
        });
        appendSetCookie(res, del);
      },
    },
  });
}
