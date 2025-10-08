import type { Profile } from '@/types/profile';
import { supabaseBrowser } from './supabaseBrowser';

export type ProfileProgress = Pick<Profile, 'onboarding_step' | 'onboarding_complete'>;

type ProfilePatch = Partial<Profile> & Partial<ProfileProgress>;

type SupabaseProfile = Profile & { id?: string; user_id?: string };

function sanitizePatch(patch: ProfilePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

async function getSessionUserId(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export async function fetchProfile(): Promise<SupabaseProfile | null> {
  const userId = await getSessionUserId();
  const query = supabaseBrowser
    .from('profiles')
    .select('*')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') throw error;
  return (data as SupabaseProfile | null) ?? null;
}

export async function upsertProfile(patch: ProfilePatch): Promise<SupabaseProfile> {
  const userId = await getSessionUserId();
  const payload = { user_id: userId, ...sanitizePatch(patch) };

  const { data, error } = await supabaseBrowser
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data as SupabaseProfile;
}

export async function markOnboardingComplete(): Promise<void> {
  await getSessionUserId();
  await supabaseBrowser.auth.updateUser({ data: { onboarding_complete: true } });
}
