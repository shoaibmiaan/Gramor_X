import type { SupabaseClient } from '@supabase/supabase-js';

export type RepoClient = SupabaseClient<any, 'public', any>;

export type AiAssistFeature = 'paraphrase' | 'speaking_hint';

export async function insertAiAssistLog(
  client: RepoClient,
  input: {
    userId: string;
    feature: AiAssistFeature;
    payload: Record<string, unknown>;
    result: Record<string, unknown>;
    tokensUsed?: number | null;
  },
) {
  return client.from('ai_assist_logs').insert({
    user_id: input.userId,
    feature: input.feature,
    input: JSON.stringify(input.payload),
    output: input.result,
    tokens_used: input.tokensUsed ?? null,
  });
}
