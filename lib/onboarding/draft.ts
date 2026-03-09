import type { OnboardingStepId } from './steps';

const keyFor = (stepId: OnboardingStepId) => `onboarding:draft:${stepId}`;

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
