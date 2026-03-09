import type { NextPage } from 'next';

import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

const OnboardingPage: NextPage = () => {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <OnboardingWizard />
    </main>
  );
};

export default OnboardingPage;
