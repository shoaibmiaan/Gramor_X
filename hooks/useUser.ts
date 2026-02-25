// hooks/useUser.ts
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

/**
 * Client-only: reads the current user once on mount.
 * (Auth event bridging is handled in _app.tsx per your rules.)
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) {
        setUser(user ?? null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, isAuthed: !!user, userId: user?.id ?? null };
}
