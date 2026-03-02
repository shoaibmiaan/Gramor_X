import useSWR from 'swr';
import type { User } from '@supabase/supabase-js';
import {
  CURRENT_USER_CACHE_KEY,
  fetchCurrentUser,
  type CurrentUserProfile,
  type CurrentUserResult,
} from '@/lib/currentUser';

type UseUserOptions = {
  includeProfile?: boolean;
  initialData?: CurrentUserResult;
};

export function useUser(options: UseUserOptions = {}) {
  const includeProfile = options.includeProfile ?? false;
  const cacheKey = includeProfile
    ? [CURRENT_USER_CACHE_KEY, 'with-profile']
    : [CURRENT_USER_CACHE_KEY, 'user-only'];

  const { data, error, isLoading, mutate } = useSWR<CurrentUserResult>(
    cacheKey,
    () => fetchCurrentUser({ includeProfile }),
    {
      fallbackData: options.initialData,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const user: User | null = data?.user ?? null;
  const profile: CurrentUserProfile | null = data?.profile ?? null;

  return {
    user,
    profile,
    isLoading,
    loading: isLoading,
    error,
    mutate,
    refetch: mutate,
    isAuthed: !!user,
    userId: user?.id ?? null,
  };
}
