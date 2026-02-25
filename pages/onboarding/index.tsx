import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { StepShell } from '@/components/onboarding/StepShell';
import { cn } from '@/lib/utils';

type OnboardingStepId = 'goal' | 'timeline' | 'baseline' | 'vibe';

const ONBOARDING_STEPS: { id: OnboardingStepId; label: string }[] = [
  { id: 'goal', label: 'Your goal' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'baseline', label: 'Your level' },
  { id: 'vibe', label: 'Learning style' },
];

const GoalPage: NextPage = () => {
  const router = useRouter();
  const [band, setBand] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = 0; // first step

  async function handleContinue() {
    if (!band) {
      setError('Please select your target band score.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Save to backend
      const res = await fetch('/api/onboarding/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBand: band }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      // Move to next step
      await router.push('/onboarding/timeline');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    router.back();
  }

  const hint = 'Your target band determines the difficulty and focus of your AI study plan.';

  // Helper function to get band description
  const getBandDescription = (score: number): string => {
    if (score < 5) return 'Limited user';
    if (score < 6) return 'Modest user';
    if (score < 7) return 'Competent user';
    if (score < 8) return 'Good user';
    if (score < 9) return 'Very good user';
    return 'Expert user';
  };

  // Common band scores with descriptions
  const bandScores = [
    { value: 4.0, label: '4.0', description: 'Limited' },
    { value: 4.5, label: '4.5', description: 'Limited+' },
    { value: 5.0, label: '5.0', description: 'Modest' },
    { value: 5.5, label: '5.5', description: 'Modest+' },
    { value: 6.0, label: '6.0', description: 'Competent' },
    { value: 6.5, label: '6.5', description: 'Competent+' },
    { value: 7.0, label: '7.0', description: 'Good' },
    { value: 7.5, label: '7.5', description: 'Good+' },
    { value: 8.0, label: '8.0', description: 'Very Good' },
    { value: 8.5, label: '8.5', description: 'Very Good+' },
    { value: 9.0, label: '9.0', description: 'Expert' },
  ];

  return (
    <StepShell
      step={currentIndex + 1}
      total={ONBOARDING_STEPS.length}
      title="What band score are you aiming for?"
      subtitle="We'll tailor your plan to help you reach this goal."
      hint={hint}
      onNext={handleContinue}
      onBack={handleBack}
      nextDisabled={submitting || !band}
      nextLabel={submitting ? 'Saving...' : 'Continue'}
    >
      <div className="space-y-6">
        {/* Band selector grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {bandScores.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setBand(value)}
              className={cn(
                'group relative flex flex-col items-center p-4 rounded-xl border-2 transition-all',
                band === value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <span className={cn(
                'text-2xl font-bold',
                band === value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
              )}>
                {label}
              </span>
              <span className={cn(
                'text-xs mt-1',
                band === value ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
              )}>
                {description}
              </span>

              {/* Selected indicator */}
              {band === value && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selected band info */}
        {band && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {band}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-300">
                  {getBandDescription(band)} (Band {band})
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  {band === 9.0 ? 'You\'re aiming for perfection!' :
                   band >= 7.5 ? 'Great choice for university admissions.' :
                   band >= 6.5 ? 'Good target for undergraduate programs.' :
                   'A solid foundation to build upon.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          You can always adjust this later in your profile settings.
        </p>

        {/* Quick tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TipCard
            icon="🎯"
            title="Be Realistic"
            description="Choose a score that challenges you but is achievable"
          />
          <TipCard
            icon="📚"
            title="Check Requirements"
            description="Research what your target universities require"
          />
          <TipCard
            icon="📈"
            title="Consider Your Timeline"
            description="Higher scores may need more preparation time"
          />
        </div>
      </div>
    </StepShell>
  );
};

// Tip Card Component
function TipCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

export default GoalPage;