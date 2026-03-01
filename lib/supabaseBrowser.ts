// lib/supabaseBrowser.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConfigured = Boolean(url && anon);

if (!isConfigured) {
  const message =
    'Supabase environment variables are not configured. Falling back to a disabled client.';
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console -- surfaced once to aid debugging in non-configured envs
    console.warn(message);
  }
}

type GlobalWithSupabase = typeof globalThis & {
  __supabaseBrowser?: SupabaseClient<Database>;
};

const globalScope = globalThis as GlobalWithSupabase;
const isTestEnv =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' || process.env.VITEST || process.env.JEST_WORKER_ID);

const shouldCacheClient = typeof window !== 'undefined' && !isTestEnv;

const FALLBACK_URL = 'https://app.supabase.invalid';
const FALLBACK_ANON_KEY = 'public-anon-key-placeholder';

const noopFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({ error: 'Supabase client disabled: missing environment variables.' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );

const createSupabaseBrowserClient = () =>
  createClient<Database>(isConfigured ? url! : FALLBACK_URL, isConfigured ? anon! : FALLBACK_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
    ...(isConfigured ? {} : { global: { fetch: noopFetch } }),
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
