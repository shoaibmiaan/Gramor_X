import type { SpeakingPromptDifficulty, SpeakingPromptPart } from '@/types/supabase';

export type PromptPart = SpeakingPromptPart;
export type PromptDifficulty = SpeakingPromptDifficulty;

export interface PromptRecord {
  id: string;
  slug: string;
  part: PromptPart;
  topic: string;
  question: string | null;
  cueCard: string | null;
  followups: string[];
  difficulty: PromptDifficulty;
  locale: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  bookmarked?: boolean;
}

export interface PromptSearchResponse {
  items: PromptRecord[];
  page: number;
  pageSize: number;
  total: number;
}
