import type { SupabaseClient } from '@supabase/supabase-js';

export type TypedSupabaseClient = SupabaseClient<any, 'public', any>;

export interface ProfileUpdatePayload {
  language_preference?: string;
  target_band?: number;
  exam_timeframe?: string;
  exam_date?: string | null;
  study_rhythm?: string;
  notification_channels?: string[];
  notification_time?: string | null;
  onboarding_completed_at?: string | null;
}

/**
 * Upserts profile data for a given user.
 * Uses the primary key `id` (the user's UUID) – never writes to the generated `user_id` column.
 */
export async function updateProfileForUser(
  supabase: TypedSupabaseClient,
  userId: string,
  patch: ProfileUpdatePayload
) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' });

  return { error };
}