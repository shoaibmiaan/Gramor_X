// types/coach.ts
// Shared interfaces for Writing Coach sessions used across API routes and UI consumers.

import type { WritingCriterion, WritingFeedback, WritingTaskType } from '@/types/writing';

export type CoachMessageRole = 'user' | 'assistant';

export interface CoachMessage {
  id?: string;
  role: CoachMessageRole;
  content: string;
  createdAt?: string;
  tokensUsed?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface CoachStoredMessage extends CoachMessage {
  id: string;
  createdAt: string;
}

export interface WritingCoachConversationInput {
  messages: CoachMessage[];
  summary?: string | null;
}

export interface WritingCoachConversationState {
  messages: CoachStoredMessage[];
  summary?: string | null;
}

export interface WritingCoachPromptInfo {
  id: string;
  title?: string | null;
  promptText?: string | null;
  taskType: WritingTaskType;
  module?: 'academic' | 'general_training' | null;
  wordTarget?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface WritingCoachTaskState {
  responseId: string;
  task: WritingTaskType;
  prompt: WritingCoachPromptInfo | null;
  answerText?: string | null;
  wordCount?: number | null;
  overallBand?: number | null;
  bandScores?: Partial<Record<WritingCriterion, number>> | null;
  feedback?: WritingFeedback | null;
  submittedAt?: string | null;
  durationSeconds?: number | null;
  tokensUsed?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface WritingCoachAttemptState {
  attemptId: string;
  status: 'in_progress' | 'submitted' | 'graded' | 'archived';
  startedAt: string;
  submittedAt?: string | null;
  durationSeconds?: number | null;
  goalBand?: number | null;
  metadata?: Record<string, unknown> | null;
  tasks: WritingCoachTaskState[];
}

export interface WritingCoachSession {
  id: string;
  userId: string;
  attemptId?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: CoachStoredMessage[];
  summary?: string | null;
  attempt?: WritingCoachAttemptState | null;
  metadata?: Record<string, unknown> | null;
}

export interface WritingCoachSessionResponse {
  ok: true;
  session: WritingCoachSession;
}

export interface WritingCoachSessionError {
  ok: false;
  error: string;
  details?: unknown;
}

export type WritingCoachSessionResult = WritingCoachSessionResponse | WritingCoachSessionError;

export interface WritingCoachReplyRequest {
  sessionId: string;
  message: string;
  stream?: boolean;
}

export type WritingCoachReplyChunk =
  | { type: 'token'; value: string }
  | { type: 'done'; value?: string; metadata?: Record<string, unknown> }
  | { type: 'error'; error: string };

