import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeacherProfile, UpsertTeacherPayload } from '@/types/db/teacher';

const PROFILES = 'profiles';

export async function getMyTeacherProfile(
  supabase: SupabaseClient,
): Promise<TeacherProfile | null> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return null;

  const { data, error } = await supabase
    .from(PROFILES)
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data as TeacherProfile;
}

export async function upsertMyTeacherProfile(
  supabase: SupabaseClient,
  payload: UpsertTeacherPayload,
): Promise<TeacherProfile> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  const update = {
    ...payload,
    role: 'teacher',
    teacher_onboarding_completed: true,
  };

  const { data, error } = await supabase
    .from(PROFILES)
    .update(update)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TeacherProfile;
}
