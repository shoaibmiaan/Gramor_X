import { useMemo } from 'react';
import { onboardingStepPayloadSchema, TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding/schema';

type StepData = Record<string, unknown>;

export type StepValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export function useStepValidation(step: number, data: StepData): StepValidationResult {
  return useMemo(() => {
    if (step < 1 || step > TOTAL_ONBOARDING_STEPS) {
      return {
        isValid: false,
        errors: { _form: 'Invalid onboarding step.' },
      };
    }

    const result = onboardingStepPayloadSchema.safeParse({ step, data });
    if (result.success) {
      return { isValid: true, errors: {} };
    }

    const errors: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const dataPath = issue.path[0] === 'data' ? issue.path.slice(1) : issue.path;
      const key = dataPath.length ? dataPath.join('.') : '_form';
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }

    return {
      isValid: false,
      errors,
    };
  }, [data, step]);
}
