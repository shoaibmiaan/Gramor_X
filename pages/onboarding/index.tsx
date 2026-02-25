import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useMemo, useState } from 'react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';
import StepShell from '@/components/onboarding/StepShell';

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
      // Save to backend (could be step-specific API or store in local state)
      const res = await fetch('/api/onboarding/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBand: band }),
      });

      if (!res.ok) throw new Error('Failed to save');

      // Move to next step
      await router.push('/onboarding/timeline');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    router.back();
  }

  const hint =
    'Your target band determines the difficulty and focus of your AI study plan.';

  return (
    <StepShell
      step={currentIndex + 1}
      total={ONBOARDING_STEPS.length}
      title="What band score are you aiming for?"
      subtitle="We’ll tailor your plan to help you reach this goal."
      hint={hint}
      onNext={handleContinue}
      onBack={handleBack}
      nextDisabled={submitting || !band}
    >
      <div className="space-y-4">
        {/* Band selector - simple slider or buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {[4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(
            (value) => (
              <button
                key={value}
                onClick={() => setBand(value)}
                className={cn(
                  'h-12 w-16 rounded-xl border text-center font-semibold transition-all sm:h-14 sm:w-20',
                  band === value
                    ? 'border-primary bg-primary text-primary-foreground shadow-md'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted'
                )}
              >
                {value}
              </button>
            )
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-center text-xs text-muted-foreground">
          You can always adjust this later in your profile.
        </p>
      </div>
    </StepShell>
  );
};

export default GoalPage;