'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export function useHeaderState(initialStreak?: number) {
  const router = useRouter();

  // Streak (prop wins; otherwise fetch)
  const [streak, setStreak] = useState<number>(initialStreak ?? 0);
  useEffect(() => {
    if (typeof initialStreak === 'number') setStreak(initialStreak);
  }, [initialStreak]);
  const fetchStreak = useCallback(async () => {
    if (typeof initialStreak === 'number') return;
    const { data: session } = await supabaseBrowser.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      setStreak(0);
      return;
    }
    const res = await fetch('/api/words/today', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const j = await res.json();
      if (typeof j?.streakDays === 'number') setStreak(j.streakDays);
    }
  }, [initialStreak]);
  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);
  useEffect(() => {
    const onChanged = (e: Event) => {
      const ce = e as CustomEvent<{ value?: number }>;
      if (typeof ce.detail?.value === 'number') setStreak(ce.detail.value);
      else fetchStreak();
    };
    window.addEventListener('streak:changed', onChanged as EventListener);
    return () => window.removeEventListener('streak:changed', onChanged as EventListener);
  }, [fetchStreak]);

  useEffect(() => {
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchStreak();
      } else {
        setStreak(0);
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [fetchStreak]);

  const signOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut();
    setStreak(0);
    router.replace('/login');
  }, [router]);

  return { streak, signOut };
}

