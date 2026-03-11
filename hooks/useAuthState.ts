import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getSession, onAuthStateChange } from '@/lib/auth';

export function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { session: currentSession } = await getSession();
      if (cancelled) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    })();

    const { data: listener } = onAuthStateChange((_, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading, userId: user?.id ?? null };
}
