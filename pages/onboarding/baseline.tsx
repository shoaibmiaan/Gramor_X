import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import StepShell from '@/components/onboarding/StepShell';
import { cn } from '@/lib/utils';

const ONBOARDING_STEPS = [
  { id: 'goal', label: 'Your goal' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'baseline', label: 'Your level' },
  { id: 'vibe', label: 'Learning style' },
];

type Skill = 'reading' | 'writing' | 'listening' | 'speaking';
type Score = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9;

const SCORES: Score[] = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9,
];

const BaselinePage: NextPage = () => {
  const router = useRouter();
  const [scores, setScores] = useState<Record<Skill, Score | null>>({
    reading: null,
    writing: null,
    listening: null,
    speaking: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateScore = (skill: Skill, score: Score) => {
    setScores((prev) => ({ ...prev, [skill]: score }));
  };

  const allSelected = Object.values(scores).every((v) => v !== null);

  const handleContinue = async () => {
    if (!allSelected) {
      setError('Please rate all four skills.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scores),
      });

      if (!res.ok) throw new Error('Failed to save');
      await router.push('/onboarding/vibe');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => router.back();

  const hint = 'This helps us identify your strengths and areas to focus.';

  return (
    <StepShell
      step={3}
      total={ONBOARDING_STEPS.length}
      title="How would you rate your current level?"
      subtitle="Be honest – this makes your AI plan more accurate."
      hint={hint}
      onNext={handleContinue}
      onBack={handleBack}
      nextDisabled={submitting || !allSelected}
    >
      <div className="space-y-6">
        {(['reading', 'writing', 'listening', 'speaking'] as Skill[]).map((skill) => (
          <div key={skill} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium capitalize">{skill}</label>
              <span className="text-xs text-muted-foreground">
                {scores[skill] !== null ? `Band ${scores[skill]}` : 'Not set'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {SCORES.map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => updateScore(skill, score)}
                  disabled={submitting}
                  className={cn(
                    'h-8 w-8 rounded-md border text-xs font-medium transition-all',
                    scores[skill] === score
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:border-primary/50',
                    submitting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </StepShell>
  );
};

export default BaselinePage;