// lib/supabaseSSR.ts
// A tiny SSR helper for API routes that need to READ+WRITE Supabase cookies.
// Does not touch your existing supabaseServer.ts.

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function readCookie(req: NextApiRequest, name: string) {
  const raw = req.headers.cookie ?? '';
  const parts = raw.split(/; */);
  for (const p of parts) {
    const [k, ...v] = p.split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.expires) parts.push(`Expires=${(options.expires as Date).toUTCString()}`);
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

export function createSSRClient<T = any>(req: NextApiRequest, res: NextApiResponse) {
  if (!URL || !ANON) throw new Error('Supabase env missing');
  return createServerClient<T>(URL, ANON, {
    cookies: {
      get: (name: string) => readCookie(req, name),
      set: (name: string, value: string, options: CookieOptions) => {
        const prev = res.getHeader('Set-Cookie');
        const next = serializeCookie(name, value, options);
        res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, next] : next);
      },
      remove: (name: string, options: CookieOptions) => {
        const prev = res.getHeader('Set-Cookie');
        const next = serializeCookie(name, '', { ...options, maxAge: 0 });
        res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, next] : next);
      },
    },
  });
}
