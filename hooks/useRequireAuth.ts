import { useEffect } from 'react';
import { useRouter } from 'next/router';

import { useUserContext } from '@/context/UserContext';

export function useRequireAuth() {
  const router = useRouter();
  const { user, loading } = useUserContext();

  useEffect(() => {
    if (!loading && !user) {
      void router.replace('/login');
    }
  }, [loading, user, router]);

  return { user, loading, isAuthenticated: !!user };
}
