// lib/offline/draftQueue.ts
// High-level queue helpers built on IndexedDB storage for writing drafts and exam events.

import {
  offlineDb,
  type DraftPayload,
  type DraftTaskId,
  type DraftTaskSnapshot,
  type StoredDraftRecord,
  type StoredEventRecord,
} from '@/lib/offline/indexedDb';

const SCHEMA_VERSION = 2;

const clampNumber = (value: unknown, fallback: number): number => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const sanitizeTask = (snapshot: DraftTaskSnapshot | undefined): DraftTaskSnapshot | undefined => {
  if (!snapshot) return undefined;
  const content = typeof snapshot.content === 'string' ? snapshot.content : '';
  const wordCount = Math.max(0, Math.round(clampNumber(snapshot.wordCount, 0)));
  return { content, wordCount };
};

const sanitizeTasks = (
  tasks: DraftPayload['tasks'],
): Partial<Record<DraftTaskId, DraftTaskSnapshot>> | undefined => {
  if (!tasks) return undefined;
  const sanitized: Partial<Record<DraftTaskId, DraftTaskSnapshot>> = {};
  for (const [key, value] of Object.entries(tasks)) {
    if (key === 'task1' || key === 'task2') {
      const snapshot = sanitizeTask(value as DraftTaskSnapshot | undefined);
      if (snapshot) {
        sanitized[key] = snapshot;
      }
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const sanitizeActiveTask = (value: unknown): DraftTaskId | undefined => {
  if (value === 'task1' || value === 'task2') {
    return value;
  }
  return undefined;
};

const sanitizePayload = (payload: DraftPayload): DraftPayload => ({
  tasks: sanitizeTasks(payload.tasks),
  activeTask: sanitizeActiveTask(payload.activeTask),
  elapsedSeconds: (() => {
    if (payload.elapsedSeconds === undefined) return undefined;
    return Math.max(0, Math.round(clampNumber(payload.elapsedSeconds, 0)));
  })(),
});

const now = () => Date.now();

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export interface WritingDraftQueuePayload extends DraftPayload {
  attemptId: string;
}

export type QueuedWritingDraft = StoredDraftRecord;

export interface ExamEventQueuePayload {
  attemptId: string;
  eventType: StoredEventRecord['eventType'];
  payload?: Record<string, unknown>;
  occurredAt?: number;
  offlineId?: string;
}

export type QueuedExamEvent = StoredEventRecord & { id: number };

export async function queueWritingDraft(payload: WritingDraftQueuePayload): Promise<QueuedWritingDraft | null> {
  const supported = await offlineDb.isSupported();
  if (!supported) return null;

  const attemptId = String(payload.attemptId || '').trim();
  if (!attemptId) return null;

  const existing = await offlineDb.getDraft(attemptId);
  const revision = (existing?.revision ?? 0) + 1;
  const timestamp = now();

  const record: StoredDraftRecord = {
    id: attemptId,
    kind: 'writing',
    attemptId,
    revision,
    updatedAt: timestamp,
    queuedAt: existing?.queuedAt ?? timestamp,
    payload: sanitizePayload(payload),
    schemaVersion: SCHEMA_VERSION,
  };

  await offlineDb.putDraft(record);
  return record;
}

export async function listQueuedDrafts(): Promise<QueuedWritingDraft[]> {
  const supported = await offlineDb.isSupported();
  if (!supported) return [];
  const drafts = await offlineDb.getAllDrafts();
  return drafts
    .map((draft) => ({ ...draft, payload: sanitizePayload(draft.payload ?? {}) }))
    .sort((a, b) => a.updatedAt - b.updatedAt);
}

export async function removeQueuedDraft(id: string): Promise<void> {
  const supported = await offlineDb.isSupported();
  if (!supported) return;
  await offlineDb.deleteDraft(id);
}

export async function queueExamEvent(payload: ExamEventQueuePayload): Promise<QueuedExamEvent | null> {
  const supported = await offlineDb.isSupported();
  if (!supported) return null;

  const attemptId = String(payload.attemptId || '').trim();
  if (!attemptId) return null;

  const record: StoredEventRecord = {
    kind: 'writing',
    attemptId,
    eventType: payload.eventType,
    payload: typeof payload.payload === 'object' && payload.payload ? { ...payload.payload } : undefined,
    occurredAt: Math.max(0, Math.round(clampNumber(payload.occurredAt, now()))),
    offlineId: payload.offlineId || randomId(),
    schemaVersion: SCHEMA_VERSION,
  };

  const stored = await offlineDb.addEvent(record);
  if (!stored || typeof stored.id !== 'number') return null;
  return stored as QueuedExamEvent;
}

export async function listQueuedEvents(limit = 50): Promise<QueuedExamEvent[]> {
  const supported = await offlineDb.isSupported();
  if (!supported) return [];
  const events = await offlineDb.getEvents();
  return events
    .filter((event): event is QueuedExamEvent => typeof event.id === 'number')
    .map((event) => ({ ...event, payload: event.payload ?? {} }))
    .sort((a, b) => a.occurredAt - b.occurredAt)
    .slice(0, Math.max(0, limit));
}

export async function removeQueuedEvents(ids: number[]): Promise<void> {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const supported = await offlineDb.isSupported();
  if (!supported) return;
  await offlineDb.deleteEvents(ids);
}
