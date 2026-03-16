export type OnboardingStepId =
  | 'welcome'
  | 'language'
  | 'current-level'
  | 'previous-ielts'
  | 'target-band'
  | 'exam-timeline'
  | 'study-commitment'
  | 'learning-style'
  | 'weakness'
  | 'confidence'
  | 'diagnostic'
  | 'notifications';

export type OnboardingStepDef = {
  id: OnboardingStepId;
  step: number;
  label: string;
  path: string;
  optional?: boolean;
};

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: 'welcome', step: 1, label: 'Welcome', path: '/onboarding/welcome' },
  { id: 'language', step: 2, label: 'Language', path: '/onboarding' },
  { id: 'current-level', step: 3, label: 'Current level', path: '/onboarding/current-level' },
  { id: 'previous-ielts', step: 4, label: 'Previous IELTS', path: '/onboarding/previous-ielts' },
  { id: 'target-band', step: 5, label: 'Target band', path: '/onboarding/target-band' },
  { id: 'exam-timeline', step: 6, label: 'Exam timeline', path: '/onboarding/exam-timeline' },
  {
    id: 'study-commitment',
    step: 7,
    label: 'Study commitment',
    path: '/onboarding/study-commitment',
  },
  { id: 'learning-style', step: 8, label: 'Learning style', path: '/onboarding/learning-style' },
  { id: 'weakness', step: 9, label: 'Weakness', path: '/onboarding/weakness' },
  {
    id: 'confidence',
    step: 10,
    label: 'Confidence',
    path: '/onboarding/confidence',
    optional: true,
  },
  {
    id: 'diagnostic',
    step: 11,
    label: 'Diagnostic',
    path: '/onboarding/diagnostic',
    optional: true,
  },
  { id: 'notifications', step: 12, label: 'Notifications', path: '/onboarding/notifications' },
];

const byId = new Map(ONBOARDING_STEPS.map((s) => [s.id, s] as const));

export function getStepById(id: OnboardingStepId): OnboardingStepDef {
  return byId.get(id)!;
}

export function getStepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

export function getNextStep(id: OnboardingStepId): OnboardingStepDef | null {
  const index = getStepIndex(id);
  return index >= 0 && index < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[index + 1] : null;
}

export function getPrevStep(id: OnboardingStepId): OnboardingStepDef | null {
  const index = getStepIndex(id);
  return index > 0 ? ONBOARDING_STEPS[index - 1] : null;
}
