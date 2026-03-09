// pages/onboarding/exam-date.tsx
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

type ExamTimeframe =
  | '0-30'
  | '30-60'
  | '60-90'
  | '90-plus'
  | 'not-booked';

interface TimeframeOption {
  id: ExamTimeframe;
  label: string;
  subtitle: string;
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  {
    id: '0-30',
    label: 'Within 30 days',
    subtitle: 'Very close — we’ll focus on high-impact revision.',
  },
  {
    id: '30-60',
    label: '1–2 months from now',
    subtitle: 'Enough time for a structured plan and mocks.',
  },
  {
    id: '60-90',
    label: '2–3 months from now',
    subtitle: 'Ideal window for deep skill building.',
  },
  {
    id: '90-plus',
    label: 'More than 3 months away',
    subtitle: 'Slow and steady, with weekly consistency.',
  },
  {
    id: 'not-booked',
    label: 'I haven’t booked yet',
    subtitle: 'We’ll suggest a realistic target date for you.',
  },
];

const OnboardingExamDatePage: NextPage = () => {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<ExamTimeframe>('60-90');
  const [specificDate, setSpecificDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const { next } = router.query;
    return typeof next === 'string' ? next : '/dashboard';
  }, [router.query]);

  const currentIndex = useMemo(
    () => ONBOARDING_STEPS.findIndex((s) => s.id === 'exam-date'),
    []
  );

  function handleBack() {
    router.push({
      pathname: '/onboarding/target-band',
      query: { next: nextPath },
    });
  }

  async function handleContinue() {
    setError(null);

    if (!timeframe) {
      setError('Please choose how far away your exam is.');
      return;
    }

    // optional: simple check for date if user filled it
    if (specificDate && Number.isNaN(Date.parse(specificDate))) {
      setError('Please enter a valid exam date or clear the field.');
      return;
    }

    try {
      setSubmitting(true);

      // TODO: persist exam info to your backend / Supabase profile table.
      // Example (pseudo):
      // await fetch('/api/onboarding/exam-date', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ timeframe, specificDate: specificDate || null }),
      // });

      await router.push({
        pathname: '/onboarding/study-rhythm',
        query: { next: nextPath },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError('Something went wrong while saving your exam plan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen flex-col items-center justify-center py-10">
        {/* Progress rail */}
        <div className="mb-6 w-full max-w-3xl">
          <OnboardingProgress
            steps={ONBOARDING_STEPS}
            currentIndex={currentIndex}
          />
        </div>

        {/* Main card */}
        <section className="w-full max-w-3xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                When is your IELTS exam?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                We&apos;ll adjust the intensity of your study plan based on how
                close your test date is. Shorter timelines get tighter, more
                focused practice.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              Smarter schedule, same 24 hours.
            </div>
          </header>

          {/* Timeframe grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {TIMEFRAME_OPTIONS.map((option) => (
              <TimeframeCard
                key={option.id}
                option={option}
                selected={timeframe === option.id}
                onSelect={() => setTimeframe(option.id)}
              />
            ))}
          </div>

          {/* Optional specific date */}
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  Do you already know the exact date?
                </p>
                <p className="text-xs text-muted-foreground">
                  Optional, but it helps us align your milestones with the
                  calendar.
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center">
                <label
                  htmlFor="exam-date"
                  className="text-xs font-medium text-muted-foreground sm:text-right"
                >
                  Exam date
                </label>
                <input
                  id="exam-date"
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="min-w-[180px] rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          )}

          {/* Hint */}
          <p className="mt-4 text-xs text-muted-foreground">
            Not booked yet? No problem. Pick the option that feels closest and
            you can update the exact date anytime from{' '}
            <span className="font-medium">Settings → Study plan</span>.
          </p>

          {/* Footer actions */}
          <footer className="mt-6 flex flex-col-reverse items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground"
            >
              <Icon name="arrow-left" className="mr-1.5 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <p className="hidden text-xs text-muted-foreground sm:inline">
                Next:{' '}
                <span className="font-medium">Choose your study rhythm</span>
              </p>
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={submitting || !timeframe}
              >
                {submitting ? 'Saving…' : 'Continue'}
                <Icon name="arrow-right" className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </footer>
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
        {steps.map((step, index) => {
          const active = index === currentIndex;
          return (
            <span
              key={step.id}
              className={cn(
                'flex-1 truncate text-center',
                active && 'font-medium text-foreground'
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

interface TimeframeCardProps {
  option: TimeframeOption;
  selected: boolean;
  onSelect: () => void;
}

const TimeframeCard: React.FC<TimeframeCardProps> = ({
  option,
  selected,
  onSelect,
}) => {
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
    </button>
  );
};

export default OnboardingExamDatePage;
