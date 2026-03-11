import { useAuthState } from '@/hooks/useAuthState';

export function useSupabaseSessionUser() {
  const { user, userId, loading } = useAuthState();
  return { user, userId, loading };
}
