// lib/profile/update.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateProfileByUserId } from '@/lib/repositories/profileRepository';
// If you have a generated Database type, import it and use SupabaseClient<Database>
//
// import type { Database } from '@/types/supabase';
// export type TypedSupabaseClient = SupabaseClient<Database>;
//
// For now we keep it generic to avoid breaking anything:
export type TypedSupabaseClient = SupabaseClient<any, 'public', any>;

// Narrow payload to what we actually use from profiles.
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
 * Small helper to update profiles for a given user.
 * Centralizes the Supabase update + error shape.
 */
export async function updateProfileForUser(
  supabase: TypedSupabaseClient,
  userId: string,
  patch: ProfileUpdatePayload
) {
  const { error } = await updateProfileByUserId(supabase, userId, patch as Record<string, unknown>);

  return { error };
}
