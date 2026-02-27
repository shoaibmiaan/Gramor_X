// lib/writing/autosave.ts
// Client helpers for saving and restoring writing exam drafts through the
// autosave API endpoints.

import {
  queueDraftForOffline,
  queueEventForOffline,
} from '@/lib/offline/background-sync';
import type { WritingDraftSnapshot } from '@/types/writing';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

type DraftTaskSnapshot = {
  content: string;
  wordCount: number;
};

type SaveDraftPayload = {
  attemptId: string;
  tasks: Partial<Record<'task1' | 'task2', DraftTaskSnapshot>>;
  activeTask?: 'task1' | 'task2';
  elapsedSeconds?: number;
};

type SaveDraftResponse = {
  ok: boolean;
  savedAt?: string;
  error?: string;
  queued?: boolean;
};

type LoadDraftResponse = {
  ok: boolean;
  draft?: WritingDraftSnapshot;
  error?: string;
};

const throwOnHttpError = async (res: Response) => {
  if (res.ok) return res;
  const body = await res.json().catch(() => ({}));
  const err = body?.error || res.statusText || 'Request failed';
  throw new Error(err);
};

const shouldQueueOffline = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException) {
    const transientNames = new Set(['AbortError', 'QuotaExceededError', 'NetworkError']);
    if (transientNames.has(error.name)) return true;
  }
  const message = error instanceof Error ? error.message : '';
  return /NetworkError|Failed to fetch|offline/i.test(message ?? '');
};

export const saveWritingDraft = async (payload: SaveDraftPayload): Promise<SaveDraftResponse> => {
  try {
    const res = await fetch('/api/mock/writing/save-draft', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    await throwOnHttpError(res);
    return (await res.json()) as SaveDraftResponse;
  } catch (error) {
    if (!shouldQueueOffline(error)) {
      throw error;
    }

    const queued = await queueDraftForOffline({
      attemptId: payload.attemptId,
      tasks: payload.tasks,
      activeTask: payload.activeTask,
      elapsedSeconds: payload.elapsedSeconds,
    });

    if (!queued) {
      throw error;
    }

    return { ok: true, savedAt: new Date().toISOString(), queued: true };
  }
};

export const loadWritingDraft = async (attemptId: string): Promise<LoadDraftResponse> => {
  if (typeof window === 'undefined') {
    throw new Error('loadWritingDraft can only be used in the browser');
  }
  const url = new URL('/api/mock/writing/save-draft', window.location.origin);
  url.searchParams.set('attemptId', attemptId);
  const res = await fetch(url.toString(), { method: 'GET', headers: JSON_HEADERS });
  await throwOnHttpError(res);
  return (await res.json()) as LoadDraftResponse;
};

export const persistExamEvent = async (
  attemptId: string,
  event: 'focus' | 'blur' | 'typing',
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; queued?: boolean }> => {
  try {
    const res = await fetch('/api/mock/writing/save-draft', {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ attemptId, event, payload }),
    });
    await throwOnHttpError(res);
    return (await res.json()) as { ok: boolean };
  } catch (error) {
    if (!shouldQueueOffline(error)) {
      throw error;
    }

    const queued = await queueEventForOffline({
      attemptId,
      eventType: event,
      payload,
      occurredAt: Date.now(),
    });

    if (!queued) {
      throw error;
    }

    return { ok: true, queued: true };
  }
};
