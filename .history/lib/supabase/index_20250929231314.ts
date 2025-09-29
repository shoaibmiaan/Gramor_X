import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';
import type { NextApiRequest } from 'next';

// Types
export type { Database };

// Environment variables - with safe defaults
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '';

// Singleton instances
declare global {
  var __supabaseAdmin: SupabaseClient<Database> | undefined;
  var __supabaseBrowser: SupabaseClient<Database> | undefined;
}

/**
 * COMPREHENSIVE test stub that guarantees all properties exist
 */
function createTestStub(): SupabaseClient<Database> {
  console.log('🔧 Creating Supabase test stub - environment variables missing');
  
  // Create a real-looking auth object with ALL required methods
  const authStub = {
    async getSession() {
      console.log('🔧 Test stub: getSession called');
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
      // Return the EXACT structure that real Supabase returns
      const subscription = {
        unsubscribe: () => {
          console.log('🔧 Test stub: unsubscribe called');
        }
      };
      
      // This is the CRITICAL part - return the exact structure
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

  // Create the main stub object with ALL required properties
  const stub = {
    from: fromHandler,
    auth: authStub,
    channel: (name: string) => ({
      subscribe: () => ({})
    }),
    removeChannel: () => {},
    getChannels: () => [],
  };

  return stub as unknown as SupabaseClient<Database>;
}

/**
 * Create browser client - ALWAYS returns a valid client
 */
function createBrowserClient(): SupabaseClient<Database> {
  // If we have valid environment variables, create real client
  if (supabaseUrl && supabaseAnonKey && 
      supabaseUrl.startsWith('http') && 
      supabaseAnonKey.startsWith('ey')) {
    try {
      console.log('🔧 Creating real Supabase browser client');
      return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (error) {
      console.error('Failed to create real Supabase client:', error);
    }
  }
  
  // Fallback to test stub
  console.warn('⚠️ Using Supabase test stub - check environment variables');
  return createTestStub();
}

/**
 * Admin client with service role key
 */
function createAdminClient(): SupabaseClient<Database> {
  if (supabaseUrl && serviceRoleKey && 
      supabaseUrl.startsWith('http') && 
      serviceRoleKey.startsWith('ey')) {
    try {
      return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    } catch (error) {
      console.error('Failed to create admin client:', error);
    }
  }
  
  return createTestStub();
}

// Initialize clients with guaranteed values
const initializeBrowserClient = (): SupabaseClient<Database> => {
  const client = createBrowserClient();
  
  // Verify the client has the required auth property
  if (!client.auth) {
    console.error('❌ Browser client missing auth property, using test stub');
    return createTestStub();
  }
  
  return client;
};

const initializeAdminClient = (): SupabaseClient<Database> => {
  const client = createAdminClient();
  
  if (!client.auth) {
    console.error('❌ Admin client missing auth property, using test stub');
    return createTestStub();
  }
  
  return client;
};

// Export clients with guaranteed initialization
export const supabaseAdmin: SupabaseClient<Database> = 
  globalThis.__supabaseAdmin ?? (() => {
    const client = initializeAdminClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__supabaseAdmin = client;
    }
    return client;
  })();

export const supabaseBrowser: SupabaseClient<Database> = 
  globalThis.__supabaseBrowser ?? (() => {
    const client = initializeBrowserClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__supabaseBrowser = client;
    }
    return client;
  })();

// Verify the browser client is properly initialized
console.log('🔧 supabaseBrowser initialized:', !!supabaseBrowser);
console.log('🔧 supabaseBrowser.auth initialized:', !!supabaseBrowser?.auth);

/**
 * Server client for API routes and server components
 */
export const createServerClient = (accessToken?: string) => {
  if (supabaseUrl && supabaseAnonKey) {
    try {
      return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        },
      });
    } catch (error) {
      console.error('Failed to create server client:', error);
    }
  }
  
  return createTestStub();
};

/**
 * Server client with request context
 */
export const createServerClientWithCookies = (req: NextApiRequest) => {
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const headers: Record<string, string> = { 'X-Client-Info': 'gramorx/pages-router' };
      const cookie = req?.headers?.cookie;
      if (cookie) headers['Cookie'] = String(cookie);

      return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers },
      });
    } catch (error) {
      console.error('Failed to create server client with cookies:', error);
    }
  }
  
  return createTestStub();
};

/**
 * Auth headers helper
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

// Default export for browser client
export default supabaseBrowser;