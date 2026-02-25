import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import StepShell from '@/components/onboarding/StepShell';
import { BandSelector, type Band } from '@/components/onboarding/BandSelector';

const ONBOARDING_STEPS = [
  { id: 'goal', label: 'Your goal' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'baseline', label: 'Your level' },
  { id: 'vibe', label: 'Learning style' },
];

const GoalPage: NextPage = () => {
  const router = useRouter();
  const [band, setBand] = useState<Band | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!band) {
      setError('Please select your target band score.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBand: band }),
      });

      if (!res.ok) throw new Error('Failed to save');
      await router.push('/onboarding/timeline');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => router.back();

  const hint = 'Your target band determines the difficulty and focus of your AI study plan.';

  return (
    <StepShell
      step={1}
      total={ONBOARDING_STEPS.length}
      title="What band score are you aiming for?"
      subtitle="We’ll tailor your plan to help you reach this goal."
      hint={hint}
      onNext={handleContinue}
      onBack={handleBack}
      nextDisabled={submitting || !band}
    >
      <div className="space-y-4">
        <BandSelector value={band} onChange={setBand} disabled={submitting} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-center text-xs text-muted-foreground">
          You can always adjust this later in your profile.
        </p>
      </div>
    </StepShell>
  );
};

export default GoalPage;