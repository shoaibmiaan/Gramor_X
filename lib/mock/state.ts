export type MockSection = 'listening' | 'reading' | 'writing' | 'speaking';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type DraftEnvelope<T> = { data: T; updatedAt: number };

type LegacyKeyBuilder = (mockId: string) => string;

const ACTIVE_KEY = (section: MockSection, mockId: string) => `mock:active:${section}:${mockId}`;
const DRAFT_KEY = (section: MockSection, mockId: string) => `mock:draft:${section}:${mockId}`;

const SECTION_INDEX: Record<MockSection, number> = {
  listening: 0,
  reading: 1,
  writing: 2,
  speaking: 3,
};

const SECTION_FROM_INDEX: Record<number, MockSection> = {
  0: 'listening',
  1: 'reading',
  2: 'writing',
  3: 'speaking',
};

const LEGACY_KEYS: Partial<Record<MockSection, LegacyKeyBuilder>> = {
  writing: (mockId) => `write:attempt:${mockId}`,
  listening: (mockId) => `listen:attempt:${mockId}`,
  reading: (mockId) => `read:attempt:${mockId}`,
};

const getStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const parseDraft = <T>(raw: string | null): DraftEnvelope<T> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { updatedAt?: number; data?: T } | T;
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      const payload = parsed as { updatedAt?: number; data?: T };
      const updatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now();
      return { data: payload.data as T, updatedAt };
    }
    return { data: parsed as T, updatedAt: Date.now() };
  } catch {
    return null;
  }
};

const persistDraft = <T>(section: MockSection, mockId: string, envelope: DraftEnvelope<T>) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(DRAFT_KEY(section, mockId), JSON.stringify(envelope));
  } catch {
    // swallow storage quota errors
  }
};

export const ensureMockAttemptId = (section: MockSection, mockId: string) => {
  const storage = getStorage();
  if (!storage) return randomId();
  const key = ACTIVE_KEY(section, mockId);
  const existing = storage.getItem(key);
  if (existing) return existing;
  const fresh = randomId();
  try {
    storage.setItem(key, fresh);
  } catch {
    // ignore storage write failures
  }
  return fresh;
};

export const clearMockAttemptId = (section: MockSection, mockId: string) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(ACTIVE_KEY(section, mockId));
  } catch {
    // ignore
  }
};

export const setMockAttemptId = (section: MockSection, mockId: string, attemptId: string) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ACTIVE_KEY(section, mockId), attemptId);
  } catch {
    // ignore storage write failures
  }
};

export const loadMockDraft = <T = unknown>(section: MockSection, mockId: string): DraftEnvelope<T> | null => {
  const storage = getStorage();
  if (!storage) return null;
  const key = DRAFT_KEY(section, mockId);
  const current = parseDraft<T>(storage.getItem(key));
  if (current) return current;
  const legacyKey = LEGACY_KEYS[section]?.(mockId);
  if (!legacyKey) return null;
  const legacy = parseDraft<T>(storage.getItem(legacyKey));
  if (!legacy) return null;
  try {
    storage.removeItem(legacyKey);
  } catch {}
  persistDraft(section, mockId, legacy);
  return legacy;
};

export const saveMockDraft = <T = unknown>(section: MockSection, mockId: string, data: T) => {
  persistDraft(section, mockId, { data, updatedAt: Date.now() });
};

export const clearMockDraft = (section: MockSection, mockId: string) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_KEY(section, mockId));
    const legacyKey = LEGACY_KEYS[section]?.(mockId);
    if (legacyKey) storage.removeItem(legacyKey);
  } catch {
    // ignore removal failures
  }
};

export type MockCheckpointPayload = Record<string, unknown>;

export interface MockCheckpoint {
  attemptId: string;
  section: MockSection;
  mockId: string;
  payload: MockCheckpointPayload;
  elapsed: number;
  duration?: number | null;
  completed: boolean;
  updatedAt: string;
}

export interface SaveCheckpointInput {
  attemptId: string;
  section: MockSection;
  mockId: string;
  payload: MockCheckpointPayload;
  elapsed: number;
  duration?: number;
  completed?: boolean;
  answersDelta?: Record<string, unknown>;
}

const clampSeconds = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

const clampDuration = (value?: number) => {
  if (value === undefined) return null;
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
};

export async function saveMockCheckpoint(input: SaveCheckpointInput): Promise<boolean> {
  if (!input?.attemptId) return false;
  const body = {
    attemptId: input.attemptId,
    sectionIndex: SECTION_INDEX[input.section] ?? 0,
    snapshot: input.payload ?? {},
    mockId: input.mockId,
    elapsedSeconds: clampSeconds(input.elapsed),
    durationSeconds: clampDuration(input.duration),
    completed: Boolean(input.completed),
    answers_delta: input.answersDelta && Object.keys(input.answersDelta).length > 0 ? input.answersDelta : undefined,
  };
  try {
    const res = await fetch('/api/mock/checkpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchMockCheckpoint(params: {
  attemptId?: string;
  section?: MockSection;
  includeCompleted?: boolean;
  mockId?: string;
}): Promise<MockCheckpoint | null> {
  try {
    const query = new URLSearchParams();
    if (params.attemptId) query.set('attemptId', params.attemptId);
    if (params.section) query.set('sectionIndex', String(SECTION_INDEX[params.section] ?? 0));
    if (params.includeCompleted) query.set('includeCompleted', 'true');
    if (params.mockId) query.set('mockId', params.mockId);

    const res = await fetch(`/api/mock/checkpoints?${query.toString()}`);
    const json = (await res.json()) as
      | { ok: true; checkpoint: null }
      | {
          ok: true;
          checkpoint: {
            attemptId: string;
            sectionIndex: number;
            mockId: string | null;
            snapshot: MockCheckpointPayload;
            elapsedSeconds: number;
            durationSeconds: number | null;
            completed: boolean;
            createdAt: string;
          } | null;
        }
      | { ok: false; error: string };

    if (!res.ok || !json || (json as any).ok === false) {
      return null;
    }

    const payload = (json as any).checkpoint as
      | {
          attemptId: string;
          sectionIndex: number;
          mockId: string | null;
          snapshot: MockCheckpointPayload;
          elapsedSeconds: number;
          durationSeconds: number | null;
          completed: boolean;
          createdAt: string;
        }
      | null;

    if (!payload) return null;

    const section = SECTION_FROM_INDEX[payload.sectionIndex] ?? params.section ?? 'listening';

    return {
      attemptId: payload.attemptId,
      section,
      mockId: payload.mockId ?? '',
      payload: payload.snapshot ?? {},
      elapsed: payload.elapsedSeconds ?? 0,
      duration: payload.durationSeconds ?? null,
      completed: payload.completed ?? false,
      updatedAt: payload.createdAt,
    };
  } catch {
    return null;
  }
}
