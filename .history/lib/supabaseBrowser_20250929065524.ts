import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'; // Adjust if you have typed DB

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient<Database>(url, anon, {
  auth: {
    flowType: 'pkce', // Better for browser auth
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});