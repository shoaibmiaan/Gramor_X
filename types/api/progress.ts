import type { ModuleKey } from '../attempts';

export interface AttemptProgressRequest<TDraft = unknown> {
  module: ModuleKey;
  draft: TDraft;
  elapsedSeconds?: number;
  durationSeconds?: number | null;
  completed?: boolean;
  context?: Record<string, unknown>;
  draftUpdatedAt?: string;
}

export interface AttemptProgressRecord<TDraft = unknown> {
  attemptId: string;
  module: ModuleKey;
  draft: TDraft;
  elapsedSeconds: number | null;
  durationSeconds: number | null;
  completed: boolean;
  context: Record<string, unknown>;
  draftUpdatedAt: string;
  updatedAt: string;
}

export interface AttemptProgressResponse<TDraft = unknown> {
  ok: true;
  progress: AttemptProgressRecord<TDraft>;
}

export type AttemptProgressResult<TDraft = unknown> =
  | AttemptProgressResponse<TDraft>
  | { ok: false; error: string };
