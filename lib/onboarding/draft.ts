import { ONBOARDING_STEPS, type OnboardingStepId } from './steps';

const keyFor = (stepId: OnboardingStepId) => `onboarding:draft:${stepId}`;
const syncKeyForStep = (step: number) => `onboarding:sync:step:${step}`;

type PendingSaveMeta = {
  pending: boolean;
  lastError?: string | null;
  payload?: Record<string, unknown> | null;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePendingSaveMeta(raw: string): PendingSaveMeta | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) return null;

  const { pending, lastError, payload, updatedAt } = parsed;
  if (typeof pending !== 'boolean' || typeof updatedAt !== 'string') return null;
  if (lastError !== undefined && lastError !== null && typeof lastError !== 'string') return null;
  if (payload !== undefined && payload !== null && !isRecord(payload)) return null;

  return {
    pending,
    lastError: lastError as string | null | undefined,
    payload: payload as Record<string, unknown> | null | undefined,
    updatedAt,
  };
}

export function loadDraft<T>(stepId: OnboardingStepId, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(keyFor(stepId));
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveDraft(stepId: OnboardingStepId, data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(stepId), JSON.stringify(data));
  } catch {
    // noop
  }
}

export function savePendingSyncState(
  step: number,
  payload: Record<string, unknown> | null,
  lastError?: string | null,
) {
  if (typeof window === 'undefined') return;

  const meta: PendingSaveMeta = {
    pending: true,
    payload,
    lastError: lastError ?? null,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(syncKeyForStep(step), JSON.stringify(meta));
  } catch {
    // noop
  }
}

export function clearPendingSyncState(step: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(syncKeyForStep(step));
  } catch {
    // noop
  }
}

export function loadPendingSyncState(step: number): PendingSaveMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(syncKeyForStep(step));
    return raw ? parsePendingSaveMeta(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(stepId: OnboardingStepId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(stepId));
  } catch {
    // noop
  }
}

export function clearDraftByStepNumber(step: number) {
  const def = ONBOARDING_STEPS.find((entry) => entry.step === step);
  if (!def) return;
  clearDraft(def.id);
}
