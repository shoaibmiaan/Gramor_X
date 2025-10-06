// lib/supabaseServer.ts
// Server-side Supabase helpers for Pages Router (with SSR cookie adapter).
// Exports:
// - createSupabaseServerClient(req,res)  ← preferred
// - createSupabaseServerClient({ req, res }) ← backward-compatible
// - createSupabaseEdgeClient(req,res)    ← for middleware (Edge)
// - supabaseServer(req?, cookieHeader?)  ← legacy (read-only; no cookie writes)
// - supabaseService()                    ← service-role client (server-only)
// - getServerUser(req?, res?)            ← helper to read user on server

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Replace `any` with your generated Database type when available
type DB = any;

type CreateOpts =
  | { req?: NextApiRequest; res?: NextApiResponse; serviceRole?: boolean }
  | NextApiRequest
  | undefined;

/** Small, reliable Promise-returning helper for stubbed results */
const resolved = (payload: any) => Promise.resolve(payload);

/** Test-friendly stub that mirrors the minimal supabase client surface used in handlers/tests */
function makeTestStub(): SupabaseClient<DB> {
  const fromHandler = (_table: string) => ({
    async insert(rows: any) {
      return resolved({
        data: Array.isArray(rows)
          ? rows.map((r, i) => ({ id: `stub-${i + 1}`, ...r }))
          : [{ id: 'stub-1', ...rows }],
        error: null,
      });
    },
    async select(_cols?: string) {
      return resolved({ data: [], error: null });
    },
    async update(_rows: any) {
      return resolved({ data: null, error: null });
    },
    async delete() {
      return resolved({ data: null, error: null });
    },
  });

  return {
    auth: {
      async getUser() {
        return resolved({ data: { user: null }, error: null });
      },
      async getSession() {
        return resolved({ data: { session: null }, error: null });
      },
    },
    from: fromHandler,
  } as unknown as SupabaseClient<DB>;
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = (env as any).SUPABASE_SERVICE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv() {
  const isTest = process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true';
  if (!URL || !(ANON_KEY || SERVICE_KEY)) {
    if (isTest) return false;
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / anon/service keys).');
  }
  return true;
}

/** Tiny cookie serializer (avoid extra deps) */
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

/** Safer cookie reader from a NextApiRequest */
function readReqCookie(req: NextApiRequest | undefined, name: string) {
  const raw = req?.headers?.cookie ?? '';
  for (const p of raw.split(/; */)) {
    const [k, ...v] = p.split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/**
 * Preferred: SSR client for API routes that can READ + WRITE refreshed cookies.
 * Supports both call styles:
 *   - createSupabaseServerClient(req, res)
 *   - createSupabaseServerClient({ req, res })
 * Backward compatible: if `res` is missing, cookie writes are no-ops (read-only).
 */
export function createSupabaseServerClient<T = DB>(
  arg?: CreateOpts,
  resMaybe?: NextApiResponse
): SupabaseClient<T> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true';
  if (!assertEnv()) return makeTestStub() as unknown as SupabaseClient<T>;

  // Normalize args
  let req: NextApiRequest | undefined;
  let res: NextApiResponse | undefined;
  let serviceRole = false;

  if (arg && typeof (arg as any).headers === 'object') {
    // (req, res) signature
    req = arg as NextApiRequest;
    res = resMaybe;
  } else if (arg && typeof arg === 'object') {
    const a = arg as { req?: NextApiRequest; res?: NextApiResponse; serviceRole?: boolean };
    req = a.req;
    res = a.res ?? resMaybe;
    serviceRole = !!a.serviceRole;
  }

  if (serviceRole) {
    // Service-role is NOT supported via SSR client. Use supabaseService() below.
    throw new Error('createSupabaseServerClient: serviceRole not supported; use supabaseService()');
  }

  return createServerClient<T>(URL!, ANON_KEY!, {
    cookies: {
      get: (name: string) => readReqCookie(req, name),
      set: (name: string, value: string, options: CookieOptions) => {
        if (!res) return; // backward-compat no-op when res is not provided
        const prev = res.getHeader('Set-Cookie');
        const next = serializeCookie(name, value, options);
        res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, next] : next);
      },
      remove: (name: string, options: CookieOptions) => {
        if (!res) return; // backward-compat no-op
        const prev = res.getHeader('Set-Cookie');
        const next = serializeCookie(name, '', { ...options, maxAge: 0 });
        res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, next] : next);
      },
    },
  });
}

/**
 * Edge (middleware) client with SSR cookie adapter.
 */
export function createSupabaseEdgeClient(req: NextRequest, res: NextResponse) {
  if (!assertEnv()) return createServerClient(URL!, ANON_KEY!, { cookies: { get: () => undefined, set: () => undefined, remove: () => undefined } });

  return createServerClient(URL!, ANON_KEY!, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * Legacy helper (read-only): create an anon client that reads cookies but cannot refresh/write them.
 * Prefer createSupabaseServerClient(req,res) instead.
 */
export function supabaseServer(req?: NextApiRequest, cookieHeader?: string): SupabaseClient<DB> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true';
  if (!URL || !ANON_KEY) {
    if (isTest) return makeTestStub();
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Use SSR client with get-only cookies; set/remove are no-ops.
  const get = (name: string) => {
    const raw = cookieHeader ?? req?.headers?.cookie ?? '';
    for (const p of raw.split(/; */)) {
      const [k, ...v] = p.split('=');
      if (k === name) return decodeURIComponent(v.join('='));
    }
    return undefined;
  };

  return createServerClient<DB>(URL, ANON_KEY, {
    cookies: {
      get,
      set: () => undefined,
      remove: () => undefined,
    },
  });
}

/**
 * Service-role client (server-only). Cached on globalThis to avoid recreation across HMR.
 */
declare global {
  // eslint-disable-next-line no-var
  var __supabaseServiceClient: ReturnType<typeof createClient> | undefined;
}

export function supabaseService(): SupabaseClient<DB> {
  if (typeof window !== 'undefined') throw new Error('supabaseService() can only be used on the server.');

  const isTest = process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true';
  if (!URL || !SERVICE_KEY) {
    if (isTest) return makeTestStub();
    throw new Error('Missing SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
  }

  // @ts-expect-error - caching across HMR
  if (globalThis.__supabaseServiceClient) {
    // @ts-expect-error - cached type
    return globalThis.__supabaseServiceClient as SupabaseClient<DB>;
  }

  // @ts-expect-error - cached type
  globalThis.__supabaseServiceClient = createClient<DB>(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { 'X-Client-Info': 'gramorx/pages-router-service' },
      fetch: (...args) => fetch(...args),
    },
  });

  // @ts-expect-error - cached type
  return globalThis.__supabaseServiceClient as SupabaseClient<DB>;
}

/**
 * Convenience helper to return the server user (or null).
 * Pass both req & res to allow token refresh writes; pass only req for read-only.
 */
export async function getServerUser(req?: NextApiRequest, res?: NextApiResponse) {
  try {
    const sb = res ? createSupabaseServerClient(req!, res) : createSupabaseServerClient({ req });
    const { data } = await sb.auth.getUser();
    return (data && (data.user ?? null)) || null;
  } catch {
    return null;
  }
}

// Default export for CJS compatibility
export default createSupabaseServerClient;
