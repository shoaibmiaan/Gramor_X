import type { SupabaseClient } from '@supabase/supabase-js';

export type RepoClient = SupabaseClient<any, 'public', any>;

export async function getActiveAiRecommendations(client: RepoClient, userId: string) {
  return client
    .from('ai_recommendations')
    .select('id, user_id, type, priority, content, model_version, created_at, expires_at, consumed_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
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
