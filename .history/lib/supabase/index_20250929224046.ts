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
  console.warn('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
}

// Singleton instances
declare global {
  var __supabaseAdmin: SupabaseClient<Database> | undefined;
  var __supabaseBrowser: SupabaseClient<Database> | undefined;
}

/**
 * Test stub for environments without proper keys
 */
function createTestStub(): SupabaseClient<Database> {
  const fromHandler = (_table: string) => ({
    async insert(rows: any) {
      const toArr = Array.isArray(rows) ? rows : [rows];
      return { 
        data: toArr.map((r: any, i: number) => ({ id: `stub-${i + 1}`, ...r })), 
        error: null 
      };
    },
    async select(_cols?: string) { 
      return { data: [], error: null }; 
    },
    async update(_rows: any) { 
      return { data: null, error: null }; 
    },
    async delete() { 
      return { data: null, error: null }; 
    },
    eq() { return this; },
    order() { return this; },
    single() { return Promise.resolve({ data: null, error: null }); },
  });

  return {
    // @ts-expect-error minimal stub
    from: fromHandler,
    auth: {
      // @ts-expect-error minimal stub
      getUser: async () => ({ data: { user: null }, error: null }),
      // @ts-expect-error minimal stub
      getSession: async () => ({ data: { session: null }, error: null }),
      // @ts-expect-error minimal stub
      admin: {
        createUser: async () => ({ data: { user: null }, error: null }),
        deleteUser: async () => ({ data: null, error: null }),
      },
    },
  } as any;
}

/**
 * Admin client with service role key (server-side only)
 * Falls back to test stub if keys are missing
 */
const createAdminClient = () => {
  // Use test stub if no service role key is available
  if (!serviceRoleKey || !supabaseUrl) {
    console.warn('Admin client: Using test stub - SUPABASE_SERVICE_ROLE_KEY or URL missing');
    return createTestStub();
  }

  try {
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn('Admin client: Failed to create client, using test stub', error);
    return createTestStub();
  }
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
 */
const createBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key for browser client');
    return createTestStub();
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error('Browser client: Failed to create client', error);
    return createTestStub();
  }
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
 */
export const createServerClient = (accessToken?: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Server client: Missing URL or Anon Key, using test stub');
    return createTestStub();
  }

  try {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });

    return client;
  } catch (error) {
    console.warn('Server client: Failed to create client, using test stub', error);
    return createTestStub();
  }
};

/**
 * Server client with request context (for Pages Router API routes)
 */
export const createServerClientWithCookies = (req: NextApiRequest) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Server client with cookies: Missing URL or Anon Key, using test stub');
    return createTestStub();
  }

  const headers: Record<string, string> = { 'X-Client-Info': 'gramorx/pages-router' };
  const cookie = req?.headers?.cookie;
  if (cookie) headers['Cookie'] = String(cookie);

  try {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers },
    });
  } catch (error) {
    console.warn('Server client with cookies: Failed to create client, using test stub', error);
    return createTestStub();
  }
};

/**
 * Auth headers helper for client-side authenticated requests
 */
export const getAuthHeaders = async (extra: Record<string, string> = {}) => {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session) {
      throw new Error('No active session found');
    }
    return { ...extra, Authorization: `Bearer ${session.access_token}` };
  } catch (error) {
    console.warn('getAuthHeaders: Failed to get session', error);
    throw new Error('Unable to get authentication headers');
  }
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

// Default export for browser client (most common use case)
export default supabaseBrowser;