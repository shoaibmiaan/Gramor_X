import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import StepShell from '@/components/onboarding/StepShell';
import { DatePicker } from '@/components/onboarding/DatePicker';
import { cn } from '@/lib/utils';

const ONBOARDING_STEPS = [
  { id: 'goal', label: 'Your goal' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'baseline', label: 'Your level' },
  { id: 'vibe', label: 'Learning style' },
];

const TimelinePage: NextPage = () => {
  const router = useRouter();
  const [examDate, setExamDate] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!unknown && !examDate) {
      setError('Please select your exam date or check "I don’t know yet".');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = { examDate: unknown ? null : examDate };
      const res = await fetch('/api/onboarding/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');
      await router.push('/onboarding/baseline');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => router.back();

  const hint = 'Knowing your exam date helps us pace your study schedule.';
  const minDate = new Date().toISOString().split('T')[0]; // today

  return (
    <StepShell
      step={2}
      total={ONBOARDING_STEPS.length}
      title="When is your IELTS exam?"
      subtitle="We'll count down the days and adjust your plan intensity."
      hint={hint}
      onNext={handleContinue}
      onBack={handleBack}
      nextDisabled={submitting || (!unknown && !examDate)}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="exam-date" className="text-sm font-medium">
            Exam date
          </label>
          <DatePicker
            value={examDate}
            onChange={setExamDate}
            disabled={unknown || submitting}
            min={minDate}
            placeholder="Select your exam date"
            className={cn(unknown && 'opacity-50')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="unknown"
            checked={unknown}
            onChange={(e) => {
              setUnknown(e.target.checked);
              if (e.target.checked) setExamDate(null);
            }}
            disabled={submitting}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="unknown" className="text-sm text-muted-foreground">
            I don’t know my exam date yet
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </StepShell>
  );
};

export default TimelinePage;