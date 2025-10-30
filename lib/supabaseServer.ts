// lib/supabaseServer.ts
// Server-side Supabase helpers for Pages Router.
// Exported helpers:
// - getServerClient(req, res)
// - createSupabaseServerClient(opts)
// - supabaseService()
// - getServerUser(req, res)

import { createServerClient as createSSRServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';
import { parse, serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';

import { env, supabaseEnvState } from '@/lib/env';
import type { Database } from '@/types/supabase';

// Shared types ---------------------------------------------------------------

type ServerRequest =
  | NextApiRequest
  | (IncomingMessage & { cookies?: Record<string, string | undefined> });

type ServerResponseLike =
  | NextApiResponse
  | (ServerResponse & { getHeader?(name: string): number | string | string[] | undefined });

type ServerClientOptions = {
  headers?: Record<string, string>;
  cookieOptions?: CookieOptionsWithName;
  cookieEncoding?: 'raw' | 'base64url';
};

type CreateOpts = ServerClientOptions & {
  req?: ServerRequest;
  res?: ServerResponseLike;
  serviceRole?: boolean;
};

const URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = (env as any).SUPABASE_SERVICE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const SHOULD_STUB_CLIENT = !supabaseEnvState.hasUrl || !supabaseEnvState.hasAnonKey;
const SHOULD_STUB_SERVICE = SHOULD_STUB_CLIENT || !supabaseEnvState.hasServiceKey;
const CLIENT_HEADER = 'gramorx/pages-router';

const isTest =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' || process.env.VITEST || process.env.JEST_WORKER_ID ||
    process.env.SKIP_ENV_VALIDATION === 'true');

const isProdRuntime =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  process.env.VERCEL_ENV === 'production';

// Internal helpers ----------------------------------------------------------

const resolved = <T,>(payload: T) => Promise.resolve(payload);

function makeTestStub<T = Database>(): SupabaseClient<T> {
  const createQueryBuilder = (initialData: any = []) => {
    const payload = { data: initialData, error: null as any, count: null as number | null };
    const builder: any = {
      select() {
        return builder;
      },
      returns() {
        return builder;
      },
      eq() {
        return builder;
      },
      neq() {
        return builder;
      },
      lt() {
        return builder;
      },
      lte() {
        return builder;
      },
      gt() {
        return builder;
      },
      gte() {
        return builder;
      },
      in() {
        return builder;
      },
      or() {
        return builder;
      },
      ilike() {
        return builder;
      },
      textSearch() {
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      range() {
        return builder;
      },
      maybeSingle() {
        payload.data = Array.isArray(payload.data) ? payload.data[0] ?? null : payload.data ?? null;
        return builder;
      },
      single() {
        payload.data = Array.isArray(payload.data) ? payload.data[0] ?? null : payload.data ?? null;
        return builder;
      },
      then(onFulfilled: (value: any) => any, onRejected?: (reason: unknown) => any) {
        return resolved({ ...payload }).then(onFulfilled, onRejected);
      },
    };
    return builder;
  };

  const fromHandler = (_table: string) => {
    const builder = createQueryBuilder();
    return Object.assign(builder, {
      insert(rows: any) {
        const normalized = Array.isArray(rows)
          ? rows.map((r, i) => ({ id: `stub-${i + 1}`, ...r }))
          : rows != null
          ? [{ id: 'stub-1', ...rows }]
          : [];
        return resolved({ data: normalized, error: null });
      },
      update(_rows: any) {
        return createQueryBuilder(null);
      },
      upsert(_rows: any) {
        return createQueryBuilder(null);
      },
      delete() {
        return createQueryBuilder(null);
      },
    });
  };

  const authStub = {
    async getUser() {
      return resolved({ data: { user: null }, error: null });
    },
    async getSession() {
      return resolved({ data: { session: null }, error: null });
    },
    async setSession(_session: any) {
      return resolved({ data: null, error: null });
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } }, error: null }),
  };

  const channelStub = () => ({
    on() {
      return this;
    },
    subscribe() {
      return resolved({ error: null, status: 'SUBSCRIBED' });
    },
    unsubscribe() {
      return resolved({ error: null });
    },
  });

  return {
    auth: authStub,
    from: fromHandler,
    rpc() {
      return resolved({ data: null, error: null });
    },
    channel: channelStub,
    removeAllChannels: () => undefined,
  } as unknown as SupabaseClient<T>;
}

function readRequestCookies(req?: ServerRequest) {
  if (!req) return new Map<string, string>();

  const jar = new Map<string, string>();
  const fromObject = (req as ServerRequest & { cookies?: Record<string, string | undefined> }).cookies;
  if (fromObject) {
    for (const [name, value] of Object.entries(fromObject)) {
      if (typeof value === 'string') jar.set(name, value);
    }
  }

  const header = req.headers?.cookie;
  if (typeof header === 'string') {
    const parsed = parse(header);
    for (const [name, value] of Object.entries(parsed)) {
      if (typeof value === 'string') jar.set(name, value);
    }
  }

  return jar;
}

function appendResponseCookies(res: ServerResponseLike | undefined, cookies: {
  name: string;
  value: string;
  options: Parameters<typeof serialize>[2];
}[]) {
  if (!res || typeof (res as ServerResponse).setHeader !== 'function' || cookies.length === 0) return;

  const serialized = cookies.map(({ name, value, options }) =>
    serialize(name, value, { path: '/', ...options }),
  );

  const existing = typeof res.getHeader === 'function' ? res.getHeader('Set-Cookie') : undefined;
  const existingList = Array.isArray(existing)
    ? existing
    : existing
    ? [String(existing)]
    : [];

  res.setHeader('Set-Cookie', [...existingList, ...serialized]);
}

function headerValue(headers: ServerRequest['headers'] | undefined, name: string) {
  if (!headers) return undefined;
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeBase64(value: string, variant: 'base64' | 'base64url') {
  if (variant === 'base64url') {
    value = value.replace(/-/g, '+').replace(/_/g, '/');
  }

  const padding = value.length % 4;
  if (padding) {
    value = value.padEnd(value.length + (4 - padding), '=');
  }

  return value;
}

function base64ToString(value: string, variant: 'base64' | 'base64url') {
  const normalized = normalizeBase64(value, variant);

  if (typeof atob === 'function') {
    try {
      const binary = atob(normalized);
      if (typeof TextDecoder === 'function') {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return decoder.decode(bytes);
      }

      return binary;
    } catch {
      // ignore decoding errors when using Web APIs
    }
  }

  const buffer = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
  if (buffer) {
    try {
      return buffer.from(normalized, 'base64').toString('utf8');
    } catch {
      // ignore decoding errors when using Node.js Buffer
    }
  }

  return undefined;
}

function parseAuthCookieJSON(value: string | undefined) {
  if (!value) return undefined;

  const candidates = new Set<string>();
  candidates.add(value);

  if (value.includes('%')) {
    try {
      candidates.add(decodeURIComponent(value));
    } catch {
      // ignore decoding errors
    }
  }

  for (const candidate of Array.from(candidates)) {
    try {
      const decoded = base64ToString(candidate, 'base64url');
      if (decoded) candidates.add(decoded);
    } catch {
      // ignore if not base64url
    }

    try {
      const decoded = base64ToString(candidate, 'base64');
      if (decoded) candidates.add(decoded);
    } catch {
      // ignore if not base64
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // keep trying other candidates
    }
  }

  return undefined;
}

function extractBearerFromCookies(jar: Map<string, string>) {
  const direct = jar.get('sb-access-token');
  if (direct) return `Bearer ${direct}`;

  const legacyNames = ['sb:token', 'supabase-auth-token'];

  const projectCookie = Array.from(jar.entries()).find(([name]) =>
    /^sb-[a-z0-9-]+-auth-token$/i.test(name),
  );

  if (projectCookie) legacyNames.unshift(projectCookie[0]);

  for (const name of legacyNames) {
    const parsed = parseAuthCookieJSON(jar.get(name));
    if (!parsed) continue;

    const session =
      parsed?.currentSession ??
      parsed?.session ??
      (Array.isArray(parsed) ? parsed[0] : parsed);

    const token =
      session?.access_token ??
      session?.accessToken ??
      parsed?.access_token ??
      parsed?.accessToken;

    if (typeof token === 'string' && token.length > 0) {
      return `Bearer ${token}`;
    }
  }

  return undefined;
}

function buildHeaders(
  req: ServerRequest | NextRequest | undefined,
  extra: Record<string, string> | undefined,
  cookies: Map<string, string> = new Map(),
) {
  const headers: Record<string, string> = {
    'X-Client-Info': CLIENT_HEADER,
    ...(extra ?? {}),
  };

  if (req) {
    const auth = headerValue(req.headers, 'authorization');
    if (auth && !headers.Authorization) headers.Authorization = auth;
  }

  if (!headers.Authorization) {
    const bearer = extractBearerFromCookies(cookies);
    if (bearer) headers.Authorization = bearer;
  }

  return headers;
}

function ensureEnvVars(key: string | undefined, message: string) {
  if (key || isTest) return;

  if (isProdRuntime) {
    throw new Error(message);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.warn(`${message}. Falling back to stub Supabase client.`);
  }
}

// Public helpers ------------------------------------------------------------

export function getServerClient<T = Database>(
  req: ServerRequest,
  res?: ServerResponseLike,
  opts: ServerClientOptions = {},
): SupabaseClient<T> {
  if (SHOULD_STUB_CLIENT) {
    return makeTestStub<T>();
  }

  ensureEnvVars(URL, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  ensureEnvVars(ANON_KEY, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const cookieJar = readRequestCookies(req);
  const cookies = {
    getAll: () =>
      cookieJar.size === 0
        ? []
        : Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
  } as Parameters<typeof createSSRServerClient>[2]['cookies'];

  if (res && typeof (res as ServerResponse).setHeader === 'function') {
    cookies.setAll = (items) => {
      appendResponseCookies(res, items);
    };
  }

  const headers = buildHeaders(req, opts.headers, cookieJar);

  return createSSRServerClient<T>(URL, ANON_KEY, {
    cookies,
    cookieOptions: opts.cookieOptions,
    cookieEncoding: opts.cookieEncoding,
    global: { headers },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
}

export function getMiddlewareClient<T = Database>(req: NextRequest, res: NextResponse) {
  if (SHOULD_STUB_CLIENT) {
    return makeTestStub<T>();
  }

  ensureEnvVars(URL, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  ensureEnvVars(ANON_KEY, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const cookieJar = new Map<string, string>();
  req.cookies.getAll().forEach((cookie) => {
    cookieJar.set(cookie.name, cookie.value);
  });

  return createSSRServerClient<T>(URL, ANON_KEY, {
    cookies: {
      getAll: () =>
        req.cookies
          .getAll()
          .map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options });
        });
      },
    },
    global: { headers: buildHeaders(req, undefined, cookieJar) },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
}

export function createSupabaseServerClient<T = Database>(opts: CreateOpts = {}): SupabaseClient<T> {
  if (opts.serviceRole) return supabaseService<T>();

  if (opts.req) {
    return getServerClient<T>(opts.req, opts.res, opts);
  }

  if (SHOULD_STUB_CLIENT) {
    return makeTestStub<T>();
  }

  ensureEnvVars(URL, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  ensureEnvVars(ANON_KEY, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createClient<T>(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: buildHeaders(undefined, opts.headers) },
  });
}

export function supabaseService<T = Database>(): SupabaseClient<T> {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseService() can only be used on the server.');
  }

  if (SHOULD_STUB_SERVICE) {
    return makeTestStub<T>();
  }

  ensureEnvVars(URL, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  ensureEnvVars(SERVICE_KEY, 'Missing SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');

  const existing = (globalThis as typeof globalThis & {
    __supabaseServiceClient?: SupabaseClient<T>;
  }).__supabaseServiceClient;

  if (existing) return existing;

  const client = createClient<T>(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': `${CLIENT_HEADER}-service` } },
  });

  (globalThis as typeof globalThis & { __supabaseServiceClient?: SupabaseClient<T> }).__supabaseServiceClient = client;
  return client;
}

export async function getServerUser(req: ServerRequest, res?: ServerResponseLike) {
  const sb = getServerClient(req, res);
  try {
    const { data } = await sb.auth.getUser();
    return (data && (data.user ?? null)) || null;
  } catch {
    return null;
  }
}

// Backwards-compatible aliases ---------------------------------------------

export function supabaseServer(req: ServerRequest, res?: ServerResponseLike) {
  return getServerClient(req, res);
}

export default createSupabaseServerClient;

export const createServerClient = createSupabaseServerClient;
