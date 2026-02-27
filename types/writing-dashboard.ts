import type { WritingTaskType } from '@/lib/writing/schemas';

export type PromptSource = 'library' | 'generated';

export interface PromptCard {
  id: string;
  slug: string;
  topic: string;
  taskType: WritingTaskType;
  difficulty: number;
  outlineSummary: string | null;
  outlineItems?: string[] | null;
  createdAt?: string | null;
  source?: PromptSource;
}

export interface AttemptSummary {
  id: string;
  promptSlug: string;
  promptTopic: string;
  status: 'draft' | 'submitted' | 'scored';
  updatedAt: string;
  wordCount: number;
  taskType: WritingTaskType;
  overallBand: number | null;
  hasFeedback: boolean;
}

export interface ReadinessSummary {
  pass: boolean;
  missing: string[];
}
