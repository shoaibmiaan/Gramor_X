import type { SupabaseClient } from '@supabase/supabase-js';

export type RepoClient = SupabaseClient<any, 'public', any>;

export type ProfilePlanRoleRow = {
  id?: string | null;
  user_id?: string | null;
  role?: string | null;
  plan?: string | null;
};

export async function getProfileByUserId(client: RepoClient, userId: string) {
  return client
    .from('profiles')
    .select('*')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();
}

export async function getProfileRole(client: RepoClient, userId: string) {
  return client
    .from('profiles')
    .select('id, role')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle<{ id: string; role: string | null }>();
}

export async function getProfilePlanAndRole(client: RepoClient, userId: string) {
  return client
    .from('profiles')
    .select('id, user_id, role, plan')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle<ProfilePlanRoleRow>();
}

export async function getProfileSetupState(client: RepoClient, userId: string) {
  return client
    .from('profiles')
    .select('id, user_id, setup_complete')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle<{ id?: string; user_id?: string; setup_complete?: boolean | null }>();
}

export async function updateProfileByUserId(client: RepoClient, userId: string, patch: Record<string, unknown>) {
  return client.from('profiles').update(patch).eq('id', userId);
}

export async function upsertProfileSetup(
  client: RepoClient,
  userId: string,
  basePayload: Record<string, unknown>,
  insertPayload: Record<string, unknown>,
) {
  const { data: existing, error: existingErr } = await getProfileSetupState(client, userId);
  if (existingErr) {
    return { existing: null, error: existingErr };
  }

  if (existing) {
    const key = existing.id ? 'id' : 'user_id';
    const value = existing.id ?? existing.user_id ?? userId;
    const res = await client.from('profiles').update(basePayload).eq(key, value);
    return { existing, error: res.error };
  }

  const inserted = await client.from('profiles').insert(insertPayload);
  return { existing: null, error: inserted.error };
}

export async function getLifecycleContactProfile(client: RepoClient, userId: string) {
  return client
    .from('profiles')
    .select('user_id, full_name, email, phone, phone_verified, whatsapp_opt_in, notification_channels, locale, preferred_language')
    .eq('user_id', userId)
    .maybeSingle();
}
