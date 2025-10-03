<<<<<<< HEAD
import { env } from "@/lib/env";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton client for browser context
export const supabase = createClient<Database>(url, anon);
=======
export { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
export type { Database } from '@/types/supabase';
>>>>>>> origin/main
