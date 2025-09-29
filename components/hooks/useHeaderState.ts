'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export function useHeaderState(initialStreak?: number) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo>({ id: null, email: null, name: null, avatarUrl: null });
  const [streak, setStreak] = useState<number>(initialStreak ?? 0);

  // Streak (prop wins; otherwise fetch)
  useEffect(() => {
    if (typeof initialStreak === 'number') setStreak(initialStreak);
  }, [initialStreak]);

  const fetchStreak = useCallback(async () => {
    let mounted = true;
    if (typeof initialStreak === 'number') return () => {};
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.error('Session fetch error:', error);
        return () => {};
      }
      const token = session.access_token;
      if (!token) return () => {};
      const res = await fetch('/api/streak', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Failed to fetch streak:', res.status);
        return () => {};
      }
      const j = await res.json();
      if (mounted && typeof j?.current_streak === 'number') {
        setStreak(j.current_streak);
      }
    } catch (err) {
      console.error('Failed to fetch streak:', err);
    }
    return () => { mounted = false; };
  }, [initialStreak]);

  useEffect(() => {
    let mounted = true;
    fetchStreak().then((cleanup) => {
      return () => { if (mounted && cleanup) cleanup(); };
    });
    return () => { mounted = false; };
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
    let cancelled = false;
    const computeRole = async (uid: string | null, appMeta?: any, userMeta?: any) => {
      let r: any = appMeta?.role ?? userMeta?.role ?? null;
      if (!r && uid) {
        const { data: prof, error } = await supabase.from('profiles').select('role').eq('id', uid).single();
        if (error) {
          console.error('Failed to fetch profile role:', error);
          return null;
        }
        r = prof?.role ?? null;
      }
      return r ? String(r).toLowerCase() : null;
    };

    const sync = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to get session:', error);
          return;
        }
        const s = session?.user ?? null;
        const userMeta = (s?.user_metadata ?? {}) as Record<string, unknown>;
        if (!cancelled) {
          setUser({
            id: s?.id ?? null,
            email: s?.email ?? null,
            name: typeof userMeta['full_name'] === 'string' ? (userMeta['full_name'] as string) : null,
            avatarUrl: typeof userMeta['avatar_url'] === 'string' ? (userMeta['avatar_url'] as string) : null,
          });
          const r = await computeRole(s?.id ?? null, s?.app_metadata, userMeta);
          if (!cancelled) setRole(r);
          setReady(true);
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
      }
    };
    sync();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_e: AuthChangeEvent, session: Session | null) => {
        try {
          const s = session?.user ?? null;
          const userMeta = (s?.user_metadata ?? {}) as Record<string, unknown>;
          setUser({
            id: s?.id ?? null,
            email: s?.email ?? null,
            name: typeof userMeta['full_name'] === 'string' ? (userMeta['full_name'] as string) : null,
            avatarUrl: typeof userMeta['avatar_url'] === 'string' ? (userMeta['avatar_url'] as string) : null,
          });
          const r = await computeRole(s?.id ?? null, s?.app_metadata, userMeta);
          setRole(r);
          if (!s) setStreak(0);
        } catch (err) {
          console.error('Auth state change error:', err);
        }
      }
    );

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [fetchStreak]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setStreak(0);
      router.push('/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, [router]);

  return { user, role, streak, ready, signOut };
}
