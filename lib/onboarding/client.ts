import type { OnboardingState } from './schema';
import type { OnboardingStepId } from './steps';
import { getNextStep, getPrevStep, getStepIndex, ONBOARDING_STEPS } from './steps';

export { ONBOARDING_STEPS, getStepIndex, getNextStep, getPrevStep };

export type OnboardingSaveOptions = {
  expectedVersion?: string | null;
};

export class OnboardingConflictError extends Error {
  status: number;
  latestState: OnboardingState | null;

  constructor(message: string, latestState: OnboardingState | null = null) {
    super(message);
    this.name = 'OnboardingConflictError';
    this.status = 409;
    this.latestState = latestState;
  }
}

export async function fetchOnboardingState(): Promise<OnboardingState> {
  const res = await fetch('/api/onboarding', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to load onboarding state');
  }

  return res.json();
}

export async function saveOnboardingStep(
  step: number,
  data: Record<string, unknown> | null,
  options: OnboardingSaveOptions = {},
): Promise<OnboardingState> {
  const res = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, data, expectedVersion: options.expectedVersion ?? null }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new OnboardingConflictError(
        body?.error || 'Your onboarding data changed in another session.',
        body?.latestState ?? null,
      );
    }

    throw new Error(body?.error || 'Failed to save onboarding step');
  }

  return res.json();
}

export async function skipOnboardingStep(
  step: number,
  options: OnboardingSaveOptions = {},
): Promise<OnboardingState> {
  return saveOnboardingStep(step, null, options);
}

export function resolveNavigation(stepId: OnboardingStepId) {
  return {
    index: getStepIndex(stepId),
    total: ONBOARDING_STEPS.length,
    next: getNextStep(stepId),
    prev: getPrevStep(stepId),
  };
}
