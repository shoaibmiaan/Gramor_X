import type { User } from '@supabase/supabase-js';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

export const CURRENT_USER_CACHE_KEY = 'current-user';

export async function fetchCurrentUser(): Promise<User | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user ?? null;
}
