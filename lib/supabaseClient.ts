import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

type GlobalWithSupabase = typeof globalThis & {
  __gramorxSupabase?: SupabaseClient<Database>;
};

const globalScope = globalThis as GlobalWithSupabase;

export const supabase: SupabaseClient<Database> =
  globalScope.__gramorxSupabase ??
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

if (!globalScope.__gramorxSupabase) {
  globalScope.__gramorxSupabase = supabase;
}
