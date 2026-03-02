import { useEffect } from 'react';
import useSWR from 'swr';
import type { User } from '@supabase/supabase-js';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { CURRENT_USER_CACHE_KEY, fetchCurrentUser } from '@/lib/user/fetchCurrentUser';

type UseUserResult = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<User | null | undefined>;
  refetch: () => Promise<User | null | undefined>;
};

export function useUser(): UseUserResult {
  const { data, error, isLoading, mutate } = useSWR<User | null>(
    CURRENT_USER_CACHE_KEY,
    fetchCurrentUser,
    {
      revalidateOnMount: true,
    },
  );

  useEffect(() => {
    const supabase = supabaseBrowser();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void mutate();
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [mutate]);

  const refetch = () => mutate();

  return {
    user: data ?? null,
    isLoading,
    error: (error as Error | undefined) ?? null,
    mutate,
    refetch,
  };
}
