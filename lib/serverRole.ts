import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { extractRole, type AppRole } from '@/lib/roles';

/**
 * Resolve the application role for a Supabase user on the server.
 * Falls back to the profiles table if the metadata is missing.
 */
export async function resolveUserRole(user: User | null | undefined): Promise<AppRole | null> {
  if (!user) return null;

  const metaRole = extractRole(user);
  if (metaRole) return metaRole;

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // Silently ignore errors and treat as no role.
      return null;
    }

    const value = data?.role ? String(data.role).toLowerCase() : null;
    return value === 'admin' || value === 'teacher' || value === 'student'
      ? (value as AppRole)
      : null;
  } catch {
    return null;
  }
}

export function isStaffRole(role: AppRole | null): boolean {
  return role === 'teacher' || role === 'admin';
}
