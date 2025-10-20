// lib/supabaseAdmin.ts
// Server-only Supabase admin (service-role) client with HMR-safe caching.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Accept either server or public URL (both point to the same project)
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;

// Accept either name for the service key
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

if (!url && process.env.NODE_ENV !== 'test') {
  throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL fallback)');
}
if (!serviceRoleKey && process.env.NODE_ENV !== 'test') {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
}

/** Lightweight test stub for CI/test where keys are intentionally absent */
function makeAdminTestStub(): SupabaseClient<any, 'public', any> {
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
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseAdmin: SupabaseClient | undefined;
}

export const supabaseAdmin: SupabaseClient =
  globalThis.__supabaseAdmin ??
  (() => {
    if (process.env.NODE_ENV === 'test' && !serviceRoleKey) {
      // CI/test path
      // @ts-expect-error test stub
      const stub = makeAdminTestStub();
      // @ts-expect-error cache
      globalThis.__supabaseAdmin = stub;
      // @ts-expect-error
      return stub;
    }

    const client = createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (...args) => fetch(...args) },
    });

    // cache for HMR/dev
    // @ts-expect-error cache
    globalThis.__supabaseAdmin = client;
    return client;
  })();

export default supabaseAdmin;

export function getAdminClient(): SupabaseClient {
  return supabaseAdmin;
}
