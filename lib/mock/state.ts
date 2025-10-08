export type MockSection = 'listening' | 'reading' | 'writing' | 'speaking';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const ACTIVE_KEY = (section: MockSection, mockId: string) => `mock:active:${section}:${mockId}`;

const getStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (err) {
    return null;
  }
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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

export type MockCheckpointPayload = Record<string, unknown>;

export interface MockCheckpoint {
  attemptId: string;
  section: MockSection;
  mockId: string;
  payload: MockCheckpointPayload;
  elapsed: number;
  duration?: number | null;
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

type SaveResponse = { ok: true } | { ok: false; error: string };

type FetchResponse =
  | { ok: true; checkpoint: MockCheckpoint | null }
  | { ok: false; error: string };

export async function saveMockCheckpoint(input: SaveCheckpointInput): Promise<boolean> {
  try {
    const res = await fetch('/api/mock/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as SaveResponse;
    return json.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchMockCheckpoint(params: {
  attemptId?: string;
  section?: MockSection;
}): Promise<MockCheckpoint | null> {
  try {
    const search = new URLSearchParams();
    if (params.attemptId) search.set('attemptId', params.attemptId);
    if (params.section) search.set('section', params.section);
    const qs = search.toString();
    const url = `/api/mock/checkpoint${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const json = (await res.json()) as FetchResponse;
    if (!json.ok) return null;
    return json.checkpoint ?? null;
  } catch (err) {
    return null;
  }
}
