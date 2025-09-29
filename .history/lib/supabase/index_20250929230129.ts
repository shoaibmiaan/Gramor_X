import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';

// Singleton instance for supabaseBrowser
let supabaseBrowser: SupabaseClient<Database>;

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== 'undefined') {
  // Only initialize in the browser
  if (!supabaseBrowser) {
    supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce', // Option for PKCE flow
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
}

export { supabaseBrowser };
