'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { defaultTier } from '@/config/navigation';
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
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(defaultTier);

  // Streak (prop wins; otherwise fetch)
  useEffect(() => {
    if (typeof initialStreak === 'number') setStreak(initialStreak);
  }, [initialStreak]);

  // Fail-soft streak fetch: never throw, never hide header; just default to 0 on errors.
  const fetchStreak = useCallback(async () => {
    let mounted = true;
    if (typeof initialStreak === 'number') return () => {};
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        if (mounted) setStreak(0);
        return () => { mounted = false; };
      }

      const res = await fetch('/api/streak', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        // Keep header visible — just fall back to 0
        console.warn('Streak fetch non-200:', res.status);
        if (mounted) setStreak(0);
        return () => { mounted = false; };
      }

      const j = await res.json().catch(() => null);
      const value = typeof j?.current_streak === 'number' ? j.current_streak : 0;
      if (mounted) setStreak(value);
    } catch (err) {
      console.warn('Streak fetch error (fail-soft):', err);
      if (mounted) setStreak(0);
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
    const computeIdentity = async (uid: string | null, appMeta?: any, userMeta?: any) => {
      let nextRole: any = appMeta?.role ?? userMeta?.role ?? null;
      let nextTier: SubscriptionTier | null = null;
      if (!nextRole && uid) {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('role, tier')
          .eq('id', uid)
          .single();
        if (error) {
          console.error('Failed to fetch profile role/tier:', error);
        } else {
          nextRole = prof?.role ?? null;
          nextTier = (prof?.tier as SubscriptionTier | null) ?? null;
        }
      }

      const normalizedRole = nextRole ? String(nextRole).toLowerCase() : null;
      const normalizedTier = (userMeta?.tier as SubscriptionTier | undefined) ?? nextTier ?? defaultTier;
      return { role: normalizedRole, tier: normalizedTier };
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
          const identity = await computeIdentity(s?.id ?? null, s?.app_metadata, userMeta);
          if (!cancelled) {
            setRole(identity.role);
            setSubscriptionTier(identity.tier ?? defaultTier);
          }
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
          const identity = await computeIdentity(s?.id ?? null, s?.app_metadata, userMeta);
          setRole(identity.role);
          setSubscriptionTier(identity.tier ?? defaultTier);
          if (!s) setStreak(0);
        } catch (err) {
          console.error('Auth state change error:', err);
        }
      }
    );

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onAvatarChanged = (e: Event) => {
      const ce = e as CustomEvent<{ url: string }>;
      setUser((u) => ({ ...u, avatarUrl: ce.detail.url }));
    };
    window.addEventListener('profile:avatar-changed', onAvatarChanged as EventListener);
    return () => window.removeEventListener('profile:avatar-changed', onAvatarChanged as EventListener);
  }, []);

  useEffect(() => {
    const onTierUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ tier?: SubscriptionTier; role?: string | null }>).detail;
      if (detail?.tier) setSubscriptionTier(detail.tier);
      if (Object.prototype.hasOwnProperty.call(detail ?? {}, 'role')) {
        setRole(detail?.role ?? null);
      }
    };

    window.addEventListener('subscription:tier-updated', onTierUpdated as EventListener);
    return () => window.removeEventListener('subscription:tier-updated', onTierUpdated as EventListener);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setStreak(0);
      router.push('/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, [router]);

  return { user, role, streak, ready, signOut, subscriptionTier };
}
