// types/writing.ts
// Shared writing module types consumed by API routes and components.

export type WritingTaskType = 'task1' | 'task2';

export type WritingCriterion =
  | 'task_response'
  | 'coherence_and_cohesion'
  | 'lexical_resource'
  | 'grammatical_range';

export interface WritingPrompt {
  id: string;
  slug: string;
  title: string;
  promptText: string;
  taskType: WritingTaskType;
  module: 'academic' | 'general_training';
  difficulty: 'easy' | 'medium' | 'hard';
  source?: string;
  tags?: string[];
  estimatedMinutes?: number;
  wordTarget?: number;
  metadata?: Record<string, any> | null;
}

export interface WritingExamPrompts {
  task1: WritingPrompt;
  task2: WritingPrompt;
}

export interface WritingAttempt {
  id: string;
  userId: string;
  status: 'in_progress' | 'submitted' | 'graded' | 'archived';
  startedAt: string;
  submittedAt?: string | null;
  durationSeconds?: number | null;
  goalBand?: number | null;
  examType: 'writing';
  metadata?: Record<string, any> | null;
}

export interface WritingDraftSnapshot {
  attemptId: string;
  updatedAt: string;
  task1?: {
    essay: string;
    wordCount: number;
  };
  task2?: {
    essay: string;
    wordCount: number;
  };
}

export interface WritingError {
  id?: string;
  type: 'grammar' | 'lexical' | 'coherence' | 'task' | 'general';
  message?: string;
  excerpt: string;
  suggestion?: string;
  severity?: 'low' | 'medium' | 'high';
  replacements?: string[];
  startOffset?: number;
  endOffset?: number;
}

export interface WritingFeedbackBlock {
  tag: string;
  title: string;
  description: string;
  weight?: number;
  criterion?: WritingCriterion | 'overall';
  action?: string;
}

export interface WritingFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  perCriterion: Record<WritingCriterion, { band: number; feedback: string }>;
  band9Rewrite?: string;
  errors?: WritingError[];
  blocks?: WritingFeedbackBlock[];
}

export interface WritingScorePayload {
  version: string;
  overallBand: number;
  bandScores: Record<WritingCriterion, number> & { overall?: number };
  feedback: WritingFeedback;
  wordCount: number;
  durationSeconds?: number;
  tokensUsed?: number;
}

export interface WritingResponse {
  id: string;
  attemptId?: string | null;
  examAttemptId?: string | null;
  promptId?: string | null;
  task?: WritingTaskType | null;
  answerText?: string | null;
  wordCount?: number | null;
  overallBand?: number | null;
  bandScores?: WritingScorePayload['bandScores'];
  feedback?: WritingFeedback | null;
  durationSeconds?: number | null;
  evaluationVersion?: string | null;
  tokensUsed?: number | null;
  createdAt: string;
  submittedAt?: string | null;
  metadata?: Record<string, any> | null;
}

export interface WritingResultItem {
  task: WritingTaskType;
  score: WritingScorePayload;
}
