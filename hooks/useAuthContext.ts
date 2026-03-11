import { useAuthContext as useAuthContextBase } from '@/context/AuthProvider';

export function useAuthContext() {
  return useAuthContextBase() ?? { auth: null, user: null, loading: true };
}
