import type { SupabaseClient } from '@supabase/supabase-js';

export type RepoClient = SupabaseClient<any, 'public', any>;

export async function getActiveAiRecommendations(client: RepoClient, userId: string) {
  return client
    .from('ai_recommendations')
    .select('id, user_id, type, priority, content, model_version, created_at, expires_at, consumed_at')
    .eq('user_id', userId)
    .eq('active', true)
    .is('consumed_at', null)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
}

export async function getLatestAiRecommendation(client: RepoClient, userId: string) {
  return client
    .from('ai_recommendations')
    .select('id, type, content, model_version, created_at, expires_at, consumed_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; type: string; content: { sequence?: string[] } | null }>();
}

export async function createAiRecommendation(
  client: RepoClient,
  input: {
    userId: string;
    type: string;
    priority?: number;
    content: Record<string, unknown>;
    modelVersion?: string | null;
    expiresAt?: string | null;
  },
) {
  return client.from('ai_recommendations').insert({
    user_id: input.userId,
    type: input.type,
    priority: input.priority ?? 1,
    content: input.content,
    model_version: input.modelVersion ?? null,
    expires_at: input.expiresAt ?? null,
    consumed_at: null,
    active: true,
  });
}

export async function createAiDiagnostic(
  client: RepoClient,
  userId: string,
  diagnosticType: string,
  payload: Record<string, unknown>,
  modelVersion?: string,
) {
  return client
    .from('ai_diagnostics')
    .insert({ user_id: userId, diagnostic_type: diagnosticType, payload, model_version: modelVersion ?? null });
}
