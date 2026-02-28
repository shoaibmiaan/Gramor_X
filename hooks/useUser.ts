import useSWR from 'swr';
import type { User } from '@supabase/supabase-js';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

type UserState = {
  user: User | null;
  role: string | null;
  profileComplete: boolean;
};

async function loadUserState(): Promise<UserState> {
  const supabase = supabaseBrowser();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const user = userData.user ?? null;
  if (!user) return { user: null, role: null, profileComplete: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    role: (profile?.role as string | null | undefined) ?? null,
    profileComplete: Boolean(profile?.onboarding_complete),
  };
}

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR('current-user-state', loadUserState, {
    revalidateOnFocus: false,
  });

  return {
    user: data?.user ?? null,
    role: data?.role ?? null,
    profileComplete: data?.profileComplete ?? false,
    loading: isLoading,
    isAuthed: Boolean(data?.user),
    userId: data?.user?.id ?? null,
    error,
    refresh: mutate,
  };
}
