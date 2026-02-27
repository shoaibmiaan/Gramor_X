import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import StepShell from '@/components/onboarding/StepShell';
import { LearningVibeSelector, type LearningStyle } from '@/components/onboarding/LearningVibeSelector';

const ONBOARDING_STEPS = [
  { id: 'goal', label: 'Your goal' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'baseline', label: 'Your level' },
  { id: 'vibe', label: 'Learning style' },
];

const VibePage: NextPage = () => {
  const router = useRouter();
  const [style, setStyle] = useState<LearningStyle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!style) {
      setError('Please pick your preferred learning style.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Save learning style
      const res = await fetch('/api/onboarding/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningStyle: style }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save learning style');
      }

      // Mark onboarding as complete and trigger plan generation
      const completeRes = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 4 }), // final step
      });

      if (!completeRes.ok) {
        const data = await completeRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Go to thinking page
      await router.push('/onboarding/review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => router.back();

  const hint = 'We’ll prioritize content in your favourite format.';

  return (
    <StepShell
      step={4}
      total={ONBOARDING_STEPS.length}
      title="How do you prefer to learn?"
      subtitle="Choose the style that suits you best."
      hint={hint}
      onNext={handleContinue}
      onBack={handleBack}
      nextDisabled={submitting || !style}
    >
      <div className="space-y-4">
        <LearningVibeSelector
          value={style}
          onChange={setStyle}
          disabled={submitting}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </StepShell>
  );
};

export default VibePage;