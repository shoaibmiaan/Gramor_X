// lib/profile.ts
import type { Profile } from '@/types/profile';
import { supabaseBrowser } from './supabaseBrowser';
import { findProfileByAuthId } from '@/lib/auth/profileLookup';

export type ProfileProgress = Pick<Profile, 'onboarding_step' | 'onboarding_complete'>;

type ProfilePatch = Partial<Profile> & Partial<ProfileProgress>;

type SupabaseProfile = Profile & { id?: string; user_id?: string };

function sanitizePatch(patch: ProfilePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      out[key] = value;
    }
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

  const { profile } = await findProfileByAuthId<SupabaseProfile>(supabaseBrowser, userId, '*', {
    allowLegacyUserIdFallback: true,
  });

  return profile;
}

export async function upsertProfile(patch: ProfilePatch): Promise<SupabaseProfile> {
  const userId = await getSessionUserId();
  const patchCleaned = sanitizePatch(patch);

  // 1. Try to UPDATE existing row (most common path after signup/onboarding)
  const { data: updated, error: updateErr } = await supabaseBrowser
    .from('profiles')
    .update(patchCleaned)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (!updateErr && updated) {
    return updated as SupabaseProfile;
  }

  // Temporary migration fallback: update legacy row addressed by user_id.
  const { data: legacyUpdated, error: legacyUpdateErr } = await supabaseBrowser
    .from('profiles')
    .update({ id: userId, ...patchCleaned })
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (!legacyUpdateErr && legacyUpdated) {
    return legacyUpdated as SupabaseProfile;
  }

  // 2. If no row existed → INSERT new profile
  if (updateErr?.code === 'PGRST116') { // zero rows affected
    const payload = {
      id: userId,               // PK = auth.uid()
      user_id: userId,          // optional secondary column
      ...patchCleaned,
    };

    const { data: inserted, error: insertErr } = await supabaseBrowser
      .from('profiles')
      .insert(payload)
      .select()
      .single();

    if (insertErr) {
      console.error('insert profile failed:', insertErr);
      throw insertErr;
    }

    return inserted as SupabaseProfile;
  }

  // Other real errors (RLS, constraint violation, etc.)
  console.error('update profile failed:', updateErr);
  throw updateErr || new Error('Unknown profile upsert error');
}

export async function markOnboardingComplete(): Promise<void> {
  const userId = await getSessionUserId();

  // Option A: Update auth metadata (session will reflect it after refresh)
  const { error: metaErr } = await supabaseBrowser.auth.updateUser({
    data: { onboarding_complete: true },
  });

  if (metaErr) {
    console.warn('Failed to update auth metadata:', metaErr);
    // non-fatal — continue
  }

  // Option B: Also update profiles table (more reliable for queries)
  const { error: profileErr } = await supabaseBrowser
    .from('profiles')
    .update({ onboarding_complete: true })
    .eq('id', userId);

  if (profileErr) {
    console.error('Failed to mark onboarding complete in profiles:', profileErr);
    throw profileErr;
  }
}