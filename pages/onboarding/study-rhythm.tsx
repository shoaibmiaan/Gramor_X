// pages/onboarding/study-rhythm.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useMemo, useState } from 'react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

type OnboardingStepId =
  | 'language'
  | 'target-band'
  | 'exam-date'
  | 'study-rhythm'
  | 'notifications';

const ONBOARDING_STEPS: { id: OnboardingStepId; label: string }[] = [
  { id: 'language', label: 'Language' },
  { id: 'target-band', label: 'Target band' },
  { id: 'exam-date', label: 'Exam date' },
  { id: 'study-rhythm', label: 'Study rhythm' },
  { id: 'notifications', label: 'Notifications' },
];

type RhythmOption =
  | 'daily'
  | '5days'
  | 'weekends'
  | 'flexible'
  | 'intensive';

interface RhythmChoice {
  id: RhythmOption;
  label: string;
  subtitle: string;
  badge?: string;
}

const OPTIONS: RhythmChoice[] = [
  {
    id: 'daily',
    label: 'Daily study',
    subtitle: 'Short sessions every day → fastest improvement.',
    badge: 'Recommended',
  },
  {
    id: '5days',
    label: '5 days a week',
    subtitle: 'Weekdays only. Balanced routine for professionals.',
  },
  {
    id: 'weekends',
    label: 'Weekends only',
    subtitle: 'Longer sessions on Saturday & Sunday.',
  },
  {
    id: 'flexible',
    label: 'Flexible schedule',
    subtitle: 'You pick your own days each week.',
  },
  {
    id: 'intensive',
    label: 'Intensive mode',
    subtitle: '2–3 hours daily. Best for < 30 days exams.',
  },
];

const OnboardingStudyRhythmPage: NextPage = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<RhythmOption>('daily');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const { next } = router.query;
    return typeof next === 'string' ? next : '/dashboard';
  }, [router.query]);

  const currentIndex = useMemo(
    () => ONBOARDING_STEPS.findIndex((s) => s.id === 'study-rhythm'),
    []
  );

  function handleBack() {
    router.push({
      pathname: '/onboarding/exam-date',
      query: { next: nextPath },
    });
  }

  async function handleContinue() {
    setError(null);

    try {
      setSubmitting(true);

      // TODO: save to DB
      // await fetch('/api/onboarding/study-rhythm', { ... })

      await router.push({
        pathname: '/onboarding/notifications',
        query: { next: nextPath },
      });
    } catch (e) {
      setError('Could not save your rhythm. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen flex-col items-center justify-center py-10">
        <div className="mb-6 w-full max-w-3xl">
          <OnboardingProgress
            steps={ONBOARDING_STEPS}
            currentIndex={currentIndex}
          />
        </div>

        <section className="w-full max-w-3xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
            <div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                What’s your study rhythm?
              </h1>
              <p className="mt-2 text-muted-foreground">
                We’ll schedule your lessons to match.
              </p>
            </div>

            <div className="flex items-center gap-4 sm:ml-auto">
              <Button variant="ghost" disabled={submitting} onClick={handleBack}>
                <Icon name="arrow-left" className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                disabled={submitting}
                isLoading={submitting}
                onClick={handleContinue}
              >
                Continue
                <Icon name="arrow-right" className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OPTIONS.map((option) => (
              <RhythmCard
                key={option.id}
                option={option}
                selected={selected === option.id}
                onSelect={() => setSelected(option.id)}
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-destructive">{error}</p>
          )}
        </section>
      </Container>
    </main>
  );
};

interface OnboardingProgressProps {
  steps: { id: OnboardingStepId; label: string }[];
  currentIndex: number;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  steps,
  currentIndex,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const completed = index < currentIndex;

          return (
            <div
              key={step.id}
              className="flex flex-1 items-center last:flex-none"
            >
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                  completed &&
                    'border-primary bg-primary text-primary-foreground',
                  active &&
                    !completed &&
                    'border-primary/80 bg-primary/10 text-primary',
                  !active && !completed && 'border-border bg-muted text-muted-foreground'
                )}
              >
                {completed ? (
                  <Icon name="check" className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-px flex-1 rounded-full bg-border',
                    completed && 'bg-primary/70',
                    active && 'bg-primary/50'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        {steps.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              'flex-1 truncate text-center',
              index === currentIndex && 'font-medium text-foreground'
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const RhythmCard: React.FC<{
  option: RhythmChoice;
  selected: boolean;
  onSelect: () => void;
}> = ({ option, selected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted'
      )}
      aria-label={`Select ${option.label}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base font-semibold sm:text-lg">
          {option.label}
        </span>

        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground group-hover:border-primary/70'
          )}
        >
          {selected ? <Icon name="check" className="h-3 w-3" /> : ''}
        </div>
      </div>

      <p className="text-xs text-muted-foreground sm:text-sm">
        {option.subtitle}
      </p>

      {option.badge && (
        <span className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {option.badge}
        </span>
      )}
    </button>
  );
};

export default OnboardingStudyRhythmPage;