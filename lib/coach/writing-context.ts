// lib/coach/writing-context.ts
// Utilities for Writing Coach sessions: load attempt metadata and keep conversation payloads tidy.

import { randomUUID } from 'crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import type {
  CoachMessage,
  CoachStoredMessage,
  WritingCoachAttemptState,
  WritingCoachConversationInput,
  WritingCoachConversationState,
  WritingCoachPromptInfo,
  WritingCoachTaskState,
} from '@/types/coach';
import type { WritingTaskType } from '@/types/writing';

type Client = SupabaseClient<Database>;

const MAX_STORED_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 2200;

const SAFE_ROLE = (role: unknown): CoachStoredMessage['role'] =>
  role === 'assistant' ? 'assistant' : 'user';

function generateMessageId() {
  try {
    return randomUUID();
  } catch {
    return `msg_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function clampContent(content: unknown): string {
  if (typeof content !== 'string') return '';
  return content.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_CHARS);
}

export function normalizeCoachMessage(message: CoachMessage): CoachStoredMessage | null {
  const content = clampContent(message.content);
  if (!content) return null;

  return {
    id: message.id ?? generateMessageId(),
    role: SAFE_ROLE(message.role),
    content,
    createdAt: message.createdAt ?? new Date().toISOString(),
    tokensUsed:
      typeof message.tokensUsed === 'number' && Number.isFinite(message.tokensUsed)
        ? message.tokensUsed
        : undefined,
    metadata: message.metadata ?? undefined,
  };
}

export function serializeConversationState(
  conversation: WritingCoachConversationInput,
): WritingCoachConversationState {
  const normalized = conversation.messages
    .map((msg) => normalizeCoachMessage(msg))
    .filter((msg): msg is CoachStoredMessage => !!msg);

  const trimmed = normalized.slice(-MAX_STORED_MESSAGES);

  return {
    messages: trimmed,
    summary: conversation.summary ?? null,
  };
}

export function deserializeConversationState(raw: unknown): WritingCoachConversationState {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];

  const messages = rawMessages
    .map((msg) => {
      if (!msg || typeof msg !== 'object') return null;
      return normalizeCoachMessage({
        id: typeof (msg as any).id === 'string' ? (msg as any).id : undefined,
        role: (msg as any).role === 'assistant' ? 'assistant' : 'user',
        content: typeof (msg as any).content === 'string' ? (msg as any).content : '',
        createdAt: typeof (msg as any).createdAt === 'string' ? (msg as any).createdAt : undefined,
        tokensUsed:
          typeof (msg as any).tokensUsed === 'number' ? Number((msg as any).tokensUsed) : undefined,
        metadata:
          (msg as any).metadata && typeof (msg as any).metadata === 'object'
            ? ((msg as any).metadata as Record<string, unknown>)
            : undefined,
      });
    })
    .filter((msg): msg is CoachStoredMessage => !!msg);

  const summary =
    typeof payload.summary === 'string'
      ? payload.summary
      : payload.summary === null
      ? null
      : undefined;

  return {
    messages,
    summary,
  };
}

const asTask = (value: unknown): WritingTaskType => (value === 'task1' ? 'task1' : 'task2');

const buildPromptInfo = (row: any): WritingCoachPromptInfo => ({
  id: row.id,
  title: typeof row.title === 'string' ? row.title : null,
  promptText: typeof row.prompt_text === 'string' ? row.prompt_text : null,
  taskType: asTask(row.task_type),
  module:
    row.module === 'academic' || row.module === 'general_training' ? row.module : null,
  wordTarget: typeof row.word_target === 'number' ? row.word_target : row.word_target ?? null,
  metadata: (row.metadata as Record<string, unknown> | null) ?? null,
});

export async function loadWritingAttemptContext(
  client: Client,
  userId: string,
  attemptId: string,
): Promise<WritingCoachAttemptState | null> {
  const { data: attemptRow, error: attemptError } = await client
    .from('exam_attempts')
    .select('id, user_id, status, started_at, submitted_at, duration_seconds, goal_band, metadata')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attemptRow || attemptRow.user_id !== userId) return null;

  const { data: responseRows, error: responseError } = await client
    .from('writing_responses')
    .select(
      'id, prompt_id, task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, tokens_used, submitted_at, created_at, metadata',
    )
    .eq('exam_attempt_id', attemptId)
    .order('created_at', { ascending: true });

  if (responseError) throw responseError;

  const promptIds = Array.from(
    new Set((responseRows ?? []).map((row) => row.prompt_id).filter(Boolean) as string[]),
  );

  const prompts = new Map<string, WritingCoachPromptInfo>();

  if (promptIds.length > 0) {
    const { data: promptRows, error: promptError } = await client
      .from('writing_prompts')
      .select('id, title, prompt_text, task_type, module, word_target, metadata')
      .in('id', promptIds);

    if (promptError) throw promptError;
    for (const row of promptRows ?? []) {
      prompts.set(row.id, buildPromptInfo(row));
    }
  }

  const tasks: WritingCoachTaskState[] = (responseRows ?? []).map((row) => ({
    responseId: row.id,
    task: asTask(row.task),
    prompt: row.prompt_id ? prompts.get(row.prompt_id) ?? null : null,
    answerText: typeof row.answer_text === 'string' ? row.answer_text : row.answer_text ?? null,
    wordCount: typeof row.word_count === 'number' ? row.word_count : row.word_count ?? null,
    overallBand: typeof row.overall_band === 'number' ? row.overall_band : row.overall_band ?? null,
    bandScores: (row.band_scores as Partial<Record<string, number>> | null) ?? null,
    feedback: (row.feedback as any) ?? null,
    submittedAt: row.submitted_at ?? null,
    durationSeconds:
      typeof row.duration_seconds === 'number' ? row.duration_seconds : row.duration_seconds ?? null,
    tokensUsed: typeof row.tokens_used === 'number' ? row.tokens_used : row.tokens_used ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at,
  }));

  return {
    attemptId: attemptRow.id,
    status: attemptRow.status as WritingCoachAttemptState['status'],
    startedAt: attemptRow.started_at,
    submittedAt: attemptRow.submitted_at ?? null,
    durationSeconds:
      typeof attemptRow.duration_seconds === 'number'
        ? attemptRow.duration_seconds
        : attemptRow.duration_seconds ?? null,
    goalBand:
      typeof attemptRow.goal_band === 'number' ? attemptRow.goal_band : attemptRow.goal_band ?? null,
    metadata: (attemptRow.metadata as Record<string, unknown> | null) ?? null,
    tasks,
  };
}

export function buildAttemptContextBlock(attempt: WritingCoachAttemptState | null): string {
  if (!attempt) {
    return 'Learner has not attached a specific writing attempt. Provide general IELTS writing guidance.';
  }

  const header = `Attempt ${attempt.attemptId} — status: ${attempt.status}`;
  const info: string[] = [
    `Started: ${attempt.startedAt}`,
    attempt.submittedAt ? `Submitted: ${attempt.submittedAt}` : 'Not yet submitted',
    typeof attempt.durationSeconds === 'number'
      ? `Duration: ${Math.round(attempt.durationSeconds / 60)} minutes`
      : 'Duration unknown',
    typeof attempt.goalBand === 'number' ? `Goal band: ${attempt.goalBand}` : 'Goal band not set',
  ];

  const taskSummaries = attempt.tasks.map((task) => {
    const promptTitle = task.prompt?.title ?? 'Prompt';
    const bandText =
      typeof task.overallBand === 'number' ? `Band: ${task.overallBand}` : 'Band not scored yet';
    const wordCount = typeof task.wordCount === 'number' ? `${task.wordCount} words` : 'Word count unknown';
    return `• ${task.task.toUpperCase()}: ${promptTitle} — ${bandText}, ${wordCount}`;
  });

  return [header, ...info, ...taskSummaries].join('\n');
}

