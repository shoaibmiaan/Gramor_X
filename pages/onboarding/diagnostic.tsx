import React from 'react';
import { DiagnosticSprint } from '@/components/onboarding/DiagnosticSprint';
import { OnboardingLayout } from '@/components/layouts/OnboardingLayout';

export default function DiagnosticPage() {
  return (
    <OnboardingLayout currentStep="diagnostic">
      <DiagnosticSprint />
    </OnboardingLayout>
  );
}