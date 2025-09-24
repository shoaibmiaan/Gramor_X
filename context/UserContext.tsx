// context/UserContext.tsx
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
import { supabaseBrowser } from '@/lib/supabaseBrowser';

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

async function fetchRole(userId: string | null | undefined): Promise<RoleOrGuest | null> {
  if (!userId) return 'guest';

  const { data, error } = await supabaseBrowser
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      const nextUser = session?.user ?? null;
      if (!mounted.current) return;

      setUser(nextUser);

      const nextRole = await fetchRole(nextUser?.id);
      if (!mounted.current) return;

      setRole(nextRole);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    void load();

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(true);

      const nextRole = await fetchRole(nextUser?.id);
      if (!mounted.current) return;

      setRole(nextRole);
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [load]);

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