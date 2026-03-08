import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabaseClient';

export function useSupabaseSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setUser(data.session?.user ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[supabase] session fetch error:', error);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    loading,
  };
}
