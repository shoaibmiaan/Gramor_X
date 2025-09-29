import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';
import type { NextApiRequest } from 'next';

// Types
export type { Database };

// Environment validation
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
}

// Singleton instances
declare global {
  var __supabaseAdmin: SupabaseClient<Database> | undefined;
  var __supabaseBrowser: SupabaseClient<Database> | undefined;
}

/**
 * Admin client with service role key (server-side only)
 * Bypasses RLS - use with caution
 */
const createAdminClient = () => {
  if (!serviceRoleKey && process.env.NODE_ENV !== 'test') {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  // Test stub for environments without keys
  if (process.env.NODE_ENV === 'test' && !serviceRoleKey) {
    return createTestStub();
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export const supabaseAdmin: SupabaseClient<Database> =
  globalThis.__supabaseAdmin ??
  (() => {
    const client = createAdminClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__supabaseAdmin = client;
    }
    return client;
  })();

/**
 * Browser client with anon key (client-side)
 * Respects RLS and user sessions
 */
const createBrowserClient = () => {
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

export const supabaseBrowser: SupabaseClient<Database> =
  globalThis.__supabaseBrowser ??
  (() => {
    const client = createBrowserClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__supabaseBrowser = client;
    }
    return client;
  })();

/**
 * Server client for API routes and server components
 * Can use service role or user session based on context
 */
export const createServerClient = (accessToken?: string) => {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  return client;
};

/**
 * Server client with request context (for Pages Router API routes)
 */
export const createServerClientWithCookies = (req: NextApiRequest) => {
  const headers: Record<string, string> = { 'X-Client-Info': 'gramorx/pages-router' };
  const cookie = req?.headers?.cookie;
  if (cookie) headers['Cookie'] = String(cookie);

  return createClient<Database>(supabaseUrl, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
};

/**
 * Auth headers helper for client-side authenticated requests
 */
export const getAuthHeaders = async (extra: Record<string, string> = {}) => {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) {
    throw new Error('No active session found');
  }
  return { ...extra, Authorization: `Bearer ${session.access_token}` };
};

/**
 * Admin email verification
 */
export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const raw = env.ADMIN_EMAILS || '';
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
};

// Test stub for CI/test environments
function createTestStub(): SupabaseClient<Database> {
  const fromHandler = (_table: string) => ({
    async insert(rows: any) {
      const toArr = Array.isArray(rows) ? rows : [rows];
      return { data: toArr.map((r: any, i: number) => ({ id: `stub-${i + 1}`, ...r })), error: null };
    },
    async select(_cols?: string) { return { data: [], error: null }; },
    async update(_rows: any) { return { data: null, error: null }; },
    async delete() { return { data: null, error: null }; },
    eq() { return this; },
    order() { return this; },
  });

  return {
    // @ts-expect-error minimal stub
    from: fromHandler,
    auth: {
      // @ts-expect-error minimal stub
      getUser: async () => ({ data: { user: null }, error: null }),
      // @ts-expect-error minimal stub
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  } as any;
}

// Default export for browser client (most common use case)
export default supabaseBrowser;