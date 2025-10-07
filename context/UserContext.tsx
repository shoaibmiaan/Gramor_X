'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser

type AppRole = 'student' | 'teacher' | 'admin';
type RoleOrGuest = AppRole | 'guest';

interface UserContextValue {
  user: User | null;
  role: RoleOrGuest | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);
UserContext.displayName = 'UserContext';

async function fetchRole(userId: string | null | undefined): Promise<RoleOrGuest> {
  if (!userId) return 'guest';

  const { data, error } = await supabase
    .from('profiles') // adjust if your table/column differs
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return 'guest';

  const raw = (data?.role ?? 'guest') as string;
  const normalized: RoleOrGuest =
    raw === 'student' || raw === 'teacher' || raw === 'admin' ? (raw as AppRole) : 'guest';

  return normalized;
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<RoleOrGuest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const mounted = useRef(true);
  const roleRequestId = useRef(0);

  const applyRole = useCallback(
    (userId: string | null | undefined) => {
      roleRequestId.current += 1;
      const requestId = roleRequestId.current;

      if (!mounted.current) return;

      if (!userId) {
        setRole('guest');
        return;
      }

      // Optimistically fall back to guest while the role query resolves.
      setRole((prev) => prev ?? 'guest');

      fetchRole(userId)
        .then((nextRole) => {
          if (!mounted.current || roleRequestId.current !== requestId) return;
          setRole(nextRole ?? 'guest');
        })
        .catch(() => {
          if (!mounted.current || roleRequestId.current !== requestId) return;
          setRole('guest');
        });
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const nextUser = session?.user ?? null;
      if (!mounted.current) return;

      setUser(nextUser);

      applyRole(nextUser?.id);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applyRole]);

  useEffect(() => {
    mounted.current = true;

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      applyRole(nextUser?.id);
    });

    return () => {
      mounted.current = false;
      subscription?.unsubscribe?.();
    };
  }, [load, applyRole]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      role,
      loading,
      refresh: load,
    }),
    [user, role, loading, load]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider');
  return ctx;
}