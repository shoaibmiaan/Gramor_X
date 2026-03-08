// pages/login/index.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';

import AuthOptions from '@/components/auth/AuthOptions';
import { useUserContext } from '@/context/UserContext';

export default function LoginOptions() {
  const router = useRouter();
  const { user, loading } = useUserContext();

  useEffect(() => {
    if (!loading && user) {
      void router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return <AuthOptions mode="login" />;
}
