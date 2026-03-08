import { supabase } from '@/lib/supabaseClient';

export const supabaseBrowser = supabase;

export const authHeaders = async (extra: Record<string, string> = {}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) return { ...extra };

  return { ...extra, Authorization: `Bearer ${token}` };
};
