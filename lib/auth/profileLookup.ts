import type { SupabaseClient } from '@supabase/supabase-js';

type LookupOptions = {
  allowLegacyUserIdFallback?: boolean;
};

type LookupResult<T> = {
  profile: T | null;
  usedLegacyUserIdFallback: boolean;
};

/**
 * Canonical contract: profiles.id = auth.users.id.
 * Temporary compatibility: optionally fall back to profiles.user_id during migration.
 */
export async function findProfileByAuthId<T = { id: string }>(
  supabase: Pick<SupabaseClient, 'from'>,
  userId: string,
  columns: string,
  options: LookupOptions = {},
): Promise<LookupResult<T>> {
  const allowLegacyUserIdFallback = options.allowLegacyUserIdFallback ?? true;

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select(columns)
    .eq('id', userId)
    .maybeSingle();

  if (byIdError && byIdError.code !== 'PGRST116') {
    throw byIdError;
  }

  if (byId) {
    return { profile: byId as T, usedLegacyUserIdFallback: false };
  }

  if (!allowLegacyUserIdFallback) {
    return { profile: null, usedLegacyUserIdFallback: false };
  }

  const { data: byUserId, error: byUserIdError } = await supabase
    .from('profiles')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle();

  if (byUserIdError && byUserIdError.code !== 'PGRST116') {
    throw byUserIdError;
  }

  return {
    profile: (byUserId as T | null) ?? null,
    usedLegacyUserIdFallback: !!byUserId,
  };
}
