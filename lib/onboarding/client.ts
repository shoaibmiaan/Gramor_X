import type { OnboardingState } from './schema';
import type { OnboardingStepId } from './steps';
import { getNextStep, getPrevStep, getStepIndex, ONBOARDING_STEPS } from './steps';

export { ONBOARDING_STEPS, getStepIndex, getNextStep, getPrevStep };

type ApiErrorBody = {
  error?: string;
  code?: string;
  latestState?: OnboardingState;
};

export type OnboardingSaveOptions = {
  expectedVersion?: string | null;
};

export class OnboardingApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'OnboardingApiError';
    this.status = status;
    this.code = code;
  }
}

export class OnboardingNetworkError extends OnboardingApiError {
  constructor(message = 'Network connection issue. Please check your internet and retry.') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'OnboardingNetworkError';
  }
}

export class OnboardingConflictError extends OnboardingApiError {
  latestState: OnboardingState | null;

  constructor(message: string, latestState: OnboardingState | null = null) {
    super(message, 409, 'CONFLICT');
    this.name = 'OnboardingConflictError';
    this.latestState = latestState;
  }
}

function toFriendlyMessage(status: number, code?: string, fallback?: string) {
  if (code === 'VALIDATION_ERROR' || status === 400 || status === 422) {
    return fallback || 'Some fields are invalid. Please review your inputs.';
  }
  if (status >= 500) {
    return fallback || 'Server issue while saving. Please retry in a moment.';
  }
  if (status === 401) {
    return fallback || 'Your session expired. Please sign in again.';
  }
  return fallback || 'Something went wrong while saving onboarding progress.';
}

export async function fetchOnboardingState(): Promise<OnboardingState> {
  let res: Response;
  try {
    res = await fetch('/api/onboarding', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new OnboardingNetworkError('Cannot reach server. Please check your internet and retry.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new OnboardingApiError(
      toFriendlyMessage(res.status, body.code, body.error || 'Failed to load onboarding state'),
      res.status,
      body.code || 'API_ERROR',
    );
  }

  return res.json();
}

export async function saveOnboardingStep(
  step: number,
  data: Record<string, unknown> | null,
  options: OnboardingSaveOptions = {},
): Promise<OnboardingState> {
  let res: Response;
  try {
    res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, data, expectedVersion: options.expectedVersion ?? null }),
    });
  } catch {
    throw new OnboardingNetworkError('No internet connection. Your changes are kept locally.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;

    if (res.status === 409) {
      throw new OnboardingConflictError(
        body.error || 'Your onboarding data changed in another session.',
        body.latestState ?? null,
      );
    }

    throw new OnboardingApiError(
      toFriendlyMessage(res.status, body.code, body.error || 'Failed to save onboarding step'),
      res.status,
      body.code || 'API_ERROR',
    );
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
