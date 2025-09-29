import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';
import type { NextApiRequest } from 'next';

// Types
export type { Database };

// Environment variables - don't throw errors during initialization
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

// Singleton instances
declare global {
  var __supabaseAdmin: SupabaseClient<Database> | undefined;
  var __supabaseBrowser: SupabaseClient<Database> | undefined;
}

/**
 * Comprehensive test stub that properly mimics Supabase client structure
 */
function createTestStub(): SupabaseClient<Database> {
  console.log('🔧 Creating Supabase test stub - environment variables missing');
  
  const authStub = {
    async getSession() {
      return { 
        data: { 
          session: null 
        }, 
        error: null 
      };
    },
    async getUser() {
      return { 
        data: { 
          user: null 
        }, 
        error: null 
      };
    },
    onAuthStateChange(callback: any) {
      console.log('🔧 Test stub: onAuthStateChange called');
      // Return proper structure that matches real Supabase client
      const subscription = {
        unsubscribe: () => {
          console.log('🔧 Test stub: unsubscribe called');
        }
      };
      
      return {
        data: { 
          subscription 
        }
      };
    },
    async signOut() {
      return { error: null };
    },
    async signInWithPassword(credentials: any) {
      return { data: { user: null, session: null }, error: null };
    },
    async signUp(credentials: any) {
      return { data: { user: null, session: null }, error: null };
    },
    async resetPasswordForEmail(email: string) {
      return { data: {}, error: null };
    },
    admin: {
      async createUser(attributes: any) {
        return { data: { user: null }, error: null };
      },
      async deleteUser(id: string) {
        return { data: null, error: null };
      },
    }
  };

  const fromHandler = (table: string) => ({
    async insert(rows: any) {
      const toArr = Array.isArray(rows) ? rows : [rows];
      return { 
        data: toArr.map((r: any, i: number) => ({ id: `stub-${i + 1}`, ...r })), 
        error: null 
      };
    },
    async select(columns?: string) { 
      console.log(`🔧 Test stub: select from ${table}`, columns);
      return { data: [], error: null }; 
    },
    async update(updates: any) { 
      return { data: null, error: null }; 
    },
    async delete() { 
      return { data: null, error: null }; 
    },
    eq(column: string, value: any) { 
      return this; 
    },
    order(column: string, options?: { ascending?: boolean }) { 
      return this; 
    },
    async single() { 
      return { data: null, error: null }; 
    },
    limit(count: number) { 
      return this; 
    },
  });

  // Create a proper proxy-like object that won't break
  const stub = {
    from: fromHandler,
    auth: authStub,
    // Add other commonly used properties to prevent undefined errors
    channel: (name: string) => ({
      subscribe: () => ({})
    }),
    removeChannel: () => {},
    getChannels: () => [],
  };

  return stub as any;
}

/**
 * Create a real Supabase client if environment variables are available
 */
function createRealClient(url: string, key: string, isBrowser: boolean = false): SupabaseClient<Database> {
  try {
    if (isBrowser) {
      return createClient<Database>(url, key, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } else {
      return createClient<Database>(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return createTestStub();
  }
}

/**
 * Admin client with service role key (server-side only)
 */
const createAdminClient = () => {
  if (!serviceRoleKey || !supabaseUrl) {
    console.warn('⚠️ Admin client: Missing SUPABASE_SERVICE_ROLE_KEY or URL, using test stub');
    return createTestStub();
  }

  return createRealClient(supabaseUrl, serviceRoleKey, false);
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
    console.warn('⚠️ Browser client: Missing URL or Anon Key, using test stub');
    return createTestStub();
  }

  return createRealClient(supabaseUrl, supabaseAnonKey, true);
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
    console.warn('⚠️ Server client: Missing URL or Anon Key, using test stub');
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
    console.warn('⚠️ Server client with cookies: Missing URL or Anon Key, using test stub');
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