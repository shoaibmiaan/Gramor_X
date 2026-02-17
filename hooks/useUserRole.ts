import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export const useUserRole = (userId: string) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data, error } = await supabaseBrowser
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error.message);
        return;
      }
      setRole(data?.role || 'guest');
    };

    if (userId) {
      fetchRole();
    }
  }, [userId]);

  return role;
};
