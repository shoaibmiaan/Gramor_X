// lib/writing/prompts.ts
// Shared prompt fetching helpers used by both server and client components.

import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { Database } from '@/types/supabase';
import type { WritingPrompt } from '@/types/writing';

type Client = SupabaseClient<Database>;

type ListOptions = {
  client?: Client;
  module?: 'academic' | 'general_training';
  limit?: number;
};

type GetOptions = {
  client?: Client;
};

const mapRow = (row: Database['writing_prompts']): WritingPrompt => ({
  id: row.id,
  slug: row.slug ?? row.id,
  title: row.title,
  promptText: row.prompt_text,
  taskType: (row.task_type as WritingPrompt['taskType']) ?? 'task2',
  module: (row.module as WritingPrompt['module']) ?? 'academic',
  difficulty: (row.difficulty as WritingPrompt['difficulty']) ?? 'medium',
  source: row.source ?? undefined,
  tags: row.tags ?? undefined,
  estimatedMinutes: row.estimated_minutes ?? undefined,
  wordTarget: row.word_target ?? undefined,
  metadata: row.metadata ?? undefined,
});

const getClient = (client?: Client) => client ?? supabaseBrowser;

export const listWritingPrompts = async ({ client, module, limit }: ListOptions = {}) => {
  const supabase = getClient(client);
  let query = supabase.from('writing_prompts').select('*').order('created_at', { ascending: false });
  if (module) {
    query = query.eq('module', module);
  }
  if (limit) {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRow);
};

export const getWritingPromptBySlug = async (
  slug: string,
  { client }: GetOptions = {},
): Promise<WritingPrompt | null> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from('writing_prompts')
    .select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
};
