import type { Database } from '@/types/supabase';
import type { AttemptSummary, PromptCard } from '@/types/writing-dashboard';
import type { WritingTaskType } from '@/lib/writing/schemas';

export const mapPromptRow = (
  row: Database['public']['Tables']['writing_prompts']['Row'],
): PromptCard => {
  const outline = (row.outline_json ?? null) as { summary?: unknown; items?: unknown } | null;
  const summaryValue = typeof outline?.summary === 'string' ? outline.summary : null;
  const outlineItems = Array.isArray(outline?.items)
    ? (outline?.items as unknown[]).filter((entry): entry is string => typeof entry === 'string')
    : null;

  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    taskType: row.task_type as WritingTaskType,
    difficulty: row.difficulty ?? 2,
    outlineSummary: summaryValue,
    outlineItems,
    createdAt: row.created_at ?? null,
    source: 'library',
  };
};

export const mapAttemptRow = (
  row: Database['public']['Tables']['writing_attempts']['Row'] & {
    prompt: Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null;
  },
): AttemptSummary => ({
  id: row.id,
  promptSlug: row.prompt?.slug ?? 'prompt',
  promptTopic: row.prompt?.topic ?? 'Prompt',
  status: row.status,
  updatedAt: row.updated_at,
  wordCount: row.word_count ?? 0,
  taskType: row.task_type as WritingTaskType,
  overallBand: row.overall_band,
  hasFeedback: !!row.feedback_json,
});
