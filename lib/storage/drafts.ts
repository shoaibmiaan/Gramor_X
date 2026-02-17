const STORAGE_VERSION = 1;

export interface WritingDraftContent {
  task1: string;
  task2: string;
  task1WordCount: number;
  task2WordCount: number;
}

export interface WritingDraftRecord {
  attemptId: string;
  startedAt: number;
  updatedAt: number;
  syncedAt?: number;
  content: WritingDraftContent;
}

type SerializedDraft = {
  v: number;
  attemptId: string;
  startedAt: number;
  updatedAt: number;
  syncedAt?: number;
  content: WritingDraftContent;
};

const isBrowser = typeof window !== 'undefined';

const clampNumber = (value: unknown, fallback: number) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sanitizeContent = (payload: any): WritingDraftContent => {
  const task1 = typeof payload?.task1 === 'string' ? payload.task1 : '';
  const task2 = typeof payload?.task2 === 'string' ? payload.task2 : '';
  const task1WordCount = Math.max(0, Math.round(clampNumber(payload?.task1WordCount, countWords(task1))));
  const task2WordCount = Math.max(0, Math.round(clampNumber(payload?.task2WordCount, countWords(task2))));
  return {
    task1,
    task2,
    task1WordCount,
    task2WordCount,
  };
};

const sanitizeDraft = (raw: any): WritingDraftRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  const attemptId = typeof raw.attemptId === 'string' && raw.attemptId.trim() ? raw.attemptId : null;
  if (!attemptId) return null;
  const startedAt = clampNumber(raw.startedAt, Date.now());
  const updatedAt = clampNumber(raw.updatedAt, startedAt);
  const syncedAt = raw.syncedAt !== undefined ? clampNumber(raw.syncedAt, updatedAt) : undefined;

  const content = sanitizeContent(raw.content);

  return {
    attemptId,
    startedAt,
    updatedAt,
    syncedAt,
    content,
  };
};

export function serializeDraft(draft: WritingDraftRecord): string {
  const payload: SerializedDraft = {
    v: STORAGE_VERSION,
    attemptId: draft.attemptId,
    startedAt: draft.startedAt,
    updatedAt: draft.updatedAt,
    content: draft.content,
  };
  if (typeof draft.syncedAt === 'number') {
    payload.syncedAt = draft.syncedAt;
  }
  return JSON.stringify(payload);
}

export function deserializeDraft(raw: string | null | undefined): WritingDraftRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SerializedDraft> & { version?: number };
    const version = clampNumber(parsed?.v ?? parsed?.version ?? STORAGE_VERSION, STORAGE_VERSION);
    if (version > STORAGE_VERSION) return null;
    return sanitizeDraft(parsed);
  } catch {
    return null;
  }
}

export function loadDraft(key: string): WritingDraftRecord | null {
  if (!isBrowser) return null;
  try {
    return deserializeDraft(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: WritingDraftRecord): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, serializeDraft(draft));
  } catch {
    // Swallow quota or private browsing exceptions
  }
}

export function clearDraft(key: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore removal failures
  }
}

export function markDraftSynced(draft: WritingDraftRecord, timestamp: number): WritingDraftRecord {
  return { ...draft, syncedAt: timestamp };
}

export function shouldSyncServer(draft: WritingDraftRecord, now: number, minimumElapsedMs = 3 * 60 * 1000): boolean {
  if (!draft?.attemptId) return false;
  if (now - draft.startedAt < minimumElapsedMs) return false;
  if (typeof draft.syncedAt === 'number' && draft.updatedAt <= draft.syncedAt) return false;
  return true;
}

export function countWords(text: string): number {
  if (!text) return 0;
  const normalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[-\u2010-\u2015/_]+/g, ' ')
    .replace(/[\u00ad]/g, '')
    .trim();
  if (!normalized) return 0;
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ''))
    .filter((token) => token && /[\p{L}\p{N}]/u.test(token));
  return tokens.length;
}

export type WritingDraftSyncPayload = {
  paperId: string;
  draft: WritingDraftRecord;
};
