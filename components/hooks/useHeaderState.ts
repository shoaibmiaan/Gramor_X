'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchStreak as fetchStreakApi } from '@/lib/streak';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { defaultTier } from '@/config/navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createSignedAvatarUrl, isStoragePath } from '@/lib/avatar';

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
}

export function useHeaderState(initialStreak?: number) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo>({ id: null, email: null, name: null, avatarUrl: null, avatarPath: null });
  const [streak, setStreak] = useState<number>(initialStreak ?? 0);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(defaultTier);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Streak (prop wins; otherwise fetch)
  useEffect(() => {
    if (typeof initialStreak === 'number') setStreak(initialStreak);
  }, [initialStreak]);

  // Fail-soft streak fetch: never throw, never hide header; just default to 0 on errors.
  const syncStreak = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!force && typeof initialStreak === 'number') {
        if (mountedRef.current) setStreak(initialStreak);
        return;
      }

      try {
        const data = await fetchStreakApi();
        const value = typeof data?.current_streak === 'number' ? data.current_streak : 0;
        if (mountedRef.current) setStreak(value);
      } catch (err) {
        console.warn('[useHeaderState] streak sync failed:', err);
        if (mountedRef.current) setStreak(0);
      }
    },
    [initialStreak]
  );

  useEffect(() => {
    void syncStreak();
  }, [syncStreak]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const ce = e as CustomEvent<{ value?: number }>;
      if (typeof ce.detail?.value === 'number') {
        setStreak(ce.detail.value);
        void syncStreak({ force: true });
      } else {
        void syncStreak({ force: true });
      }
    };
    window.addEventListener('streak:changed', onChanged as EventListener);
    return () => window.removeEventListener('streak:changed', onChanged as EventListener);
  }, [syncStreak]);

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

    const resolveAvatar = async (userMeta?: Record<string, unknown>) => {
      const raw = typeof userMeta?.['avatar_path'] === 'string'
        ? (userMeta?.['avatar_path'] as string)
        : typeof userMeta?.['avatar_url'] === 'string'
        ? (userMeta?.['avatar_url'] as string)
        : null;

      if (!raw) return { url: null, path: null } as const;

      if (isStoragePath(raw)) {
        try {
          const url = await createSignedAvatarUrl(raw);
          return { url, path: raw } as const;
        } catch (error) {
          console.warn('Failed to create signed avatar url for header', error);
          return { url: null, path: raw } as const;
        }
      }

      return { url: raw, path: null } as const;
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
          const avatar = await resolveAvatar(userMeta);
          setUser({
            id: s?.id ?? null,
            email: s?.email ?? null,
            name: typeof userMeta['full_name'] === 'string' ? (userMeta['full_name'] as string) : null,
            avatarUrl: avatar.url,
            avatarPath: avatar.path,
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
          const avatar = await resolveAvatar(userMeta);
          setUser({
            id: s?.id ?? null,
            email: s?.email ?? null,
            name: typeof userMeta['full_name'] === 'string' ? (userMeta['full_name'] as string) : null,
            avatarUrl: avatar.url,
            avatarPath: avatar.path,
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
      const ce = e as CustomEvent<{ url?: string | null; path?: string | null }>;
      const { url, path } = ce.detail;
      if (path && !url) {
        void createSignedAvatarUrl(path)
          .then((signed) => {
            setUser((u) => ({ ...u, avatarUrl: signed ?? u.avatarUrl, avatarPath: path }));
          })
          .catch((error) => console.warn('Failed to refresh avatar after change', error));
        return;
      }

      setUser((u) => ({
        ...u,
        avatarUrl: url ?? u.avatarUrl,
        avatarPath: path ?? u.avatarPath,
      }));
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
