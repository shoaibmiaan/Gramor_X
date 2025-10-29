import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

export function useSupabaseSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
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

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_, session) => {
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
