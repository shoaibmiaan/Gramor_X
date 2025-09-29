// lib/supabaseBrowser.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'; // Adjust if you have typed DB

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseBrowser?: SupabaseClient<Database>;
};

if (!globalForSupabase.__supabaseBrowser) {
  globalForSupabase.__supabaseBrowser = createClient<Database>(url, anon, {
    auth: {
      flowType: 'pkce', // Better for browser auth
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

export const supabaseBrowser = globalForSupabase.__supabaseBrowser;

export const authHeaders = async (extra: Record<string, string> = {}) => {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  return { ...extra, Authorization: `Bearer ${session?.access_token}` };
};