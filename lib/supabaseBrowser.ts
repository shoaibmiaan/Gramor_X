// lib/supabaseBrowser.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

type GlobalWithSupabase = typeof globalThis & {
  __supabaseBrowser?: SupabaseClient<Database>;
};

const globalScope = globalThis as GlobalWithSupabase;
const isTestEnv =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' || process.env.VITEST || process.env.JEST_WORKER_ID);

const shouldCacheClient = typeof window !== 'undefined' && !isTestEnv;

const createSupabaseBrowserClient = () =>
  createClient<Database>(url, anon, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

export const supabaseBrowser: SupabaseClient<Database> =
  shouldCacheClient && globalScope.__supabaseBrowser
    ? globalScope.__supabaseBrowser
    : createSupabaseBrowserClient();

if (shouldCacheClient) {
  globalScope.__supabaseBrowser = supabaseBrowser;
}

export const authHeaders = async (extra: Record<string, string> = {}) => {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  const token = session?.access_token;
  if (!token) return { ...extra };

  return { ...extra, Authorization: `Bearer ${token}` };
};
