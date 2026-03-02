import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export const CURRENT_USER_CACHE_KEY = 'current-user';

export type CurrentUserProfile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export type CurrentUserResult = {
  user: User | null;
  profile: CurrentUserProfile | null;
};

export async function fetchCurrentUser(options?: { includeProfile?: boolean }): Promise<CurrentUserResult> {
  const includeProfile = options?.includeProfile ?? false;

  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  const user = session?.user ?? null;
  if (!user) {
    return { user: null, profile: null };
  }

  if (!includeProfile) {
    return { user, profile: null };
  }

  const { data: profile, error } = await supabaseBrowser
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return { user, profile: null };
  }

  return {
    user,
    profile: profile
      ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role,
        }
      : null,
  };
}
