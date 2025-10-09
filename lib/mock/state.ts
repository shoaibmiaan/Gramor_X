import { getAttemptProgress, getLatestAttemptProgress, saveAttemptProgress } from '@/lib/attempts/progress';
import type { AttemptProgressRequest } from '@/types/api/progress';

export type MockSection = 'listening' | 'reading' | 'writing' | 'speaking';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type DraftEnvelope<T> = { data: T; updatedAt: number };

type LegacyKeyBuilder = (mockId: string) => string;

const ACTIVE_KEY = (section: MockSection, mockId: string) => `mock:active:${section}:${mockId}`;
const DRAFT_KEY = (section: MockSection, mockId: string) => `mock:draft:${section}:${mockId}`;

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

const readMockId = (context: Record<string, unknown> | undefined): string => {
  const value = context?.mockId;
  return typeof value === 'string' ? value : '';
};

export async function saveMockCheckpoint(input: SaveCheckpointInput): Promise<boolean> {
  if (!input?.attemptId) return false;
  const body: AttemptProgressRequest = {
    module: input.section,
    draft: input.payload ?? {},
    elapsedSeconds: clampSeconds(input.elapsed),
    durationSeconds: clampDuration(input.duration),
    completed: Boolean(input.completed),
    context: { mockId: input.mockId },
    draftUpdatedAt: new Date().toISOString(),
  };
  const res = await saveAttemptProgress(input.attemptId, body);
  return res.ok;
}

export async function fetchMockCheckpoint(params: {
  attemptId?: string;
  section?: MockSection;
  includeCompleted?: boolean;
  mockId?: string;
}): Promise<MockCheckpoint | null> {
  try {
    const module = params.section;
    const includeCompleted = params.includeCompleted ?? false;
    if (params.attemptId) {
      const response = await getAttemptProgress(params.attemptId, {
        module,
        includeCompleted,
        mockId: params.mockId,
      });
      if (!response.ok || !response.progress) return null;
      return {
        attemptId: response.progress.attemptId,
        section: response.progress.module as MockSection,
        mockId: readMockId(response.progress.context),
        payload: (response.progress.draft as MockCheckpointPayload) ?? {},
        elapsed: response.progress.elapsedSeconds ?? 0,
        duration: response.progress.durationSeconds ?? null,
        completed: response.progress.completed,
        updatedAt: response.progress.updatedAt,
      };
    }
    const latest = await getLatestAttemptProgress({ module, includeCompleted, mockId: params.mockId });
    if (!latest.ok || !latest.progress) return null;
    return {
      attemptId: latest.progress.attemptId,
      section: latest.progress.module as MockSection,
      mockId: readMockId(latest.progress.context),
      payload: (latest.progress.draft as MockCheckpointPayload) ?? {},
      elapsed: latest.progress.elapsedSeconds ?? 0,
      duration: latest.progress.durationSeconds ?? null,
      completed: latest.progress.completed,
      updatedAt: latest.progress.updatedAt,
    };
  } catch {
    return null;
  }
}
