import type { OnboardingStepId } from './steps';
import { getNextStep, getPrevStep, getStepIndex, ONBOARDING_STEPS } from './steps';

export { ONBOARDING_STEPS, getStepIndex, getNextStep, getPrevStep };

export async function saveOnboardingStep(step: number, data: Record<string, unknown>) {
  const res = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, data }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to save onboarding step');
  }

  return res.json();
}

export function resolveNavigation(stepId: OnboardingStepId) {
  return {
    index: getStepIndex(stepId),
    total: ONBOARDING_STEPS.length,
    next: getNextStep(stepId),
    prev: getPrevStep(stepId),
  };
}
