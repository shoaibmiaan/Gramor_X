// pages/onboarding/target-band.tsx
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

const STEP_ROUTES: Record<OnboardingStepId, string> = {
  language: '/onboarding/welcome',
  'target-band': '/onboarding/target-band',
  'exam-date': '/onboarding/exam-date',
  'study-rhythm': '/onboarding/study-rhythm',
  notifications: '/onboarding/notifications',
};

type TargetBand =
  | '5.5'
  | '6.0'
  | '6.5'
  | '7.0'
  | '7.5+';

interface TargetBandOption {
  id: TargetBand;
  label: string;
  subtitle: string;
  badge?: string;
}

const TARGET_OPTIONS: TargetBandOption[] = [
  {
    id: '5.5',
    label: 'Band 5.5',
    subtitle: 'Solid starter goal if you’re still building basics.',
  },
  {
    id: '6.0',
    label: 'Band 6.0',
    subtitle: 'Good for foundation programs and many colleges.',
  },
  {
    id: '6.5',
    label: 'Band 6.5',
    subtitle: 'Common requirement for universities and visas.',
    badge: 'Most popular',
  },
  {
    id: '7.0',
    label: 'Band 7.0',
    subtitle: 'Competitive score for top universities and jobs.',
  },
  {
    id: '7.5+',
    label: 'Band 7.5 or above',
    subtitle: 'Ambitious target — we’ll push you harder.',
  },
];

const OnboardingTargetBandPage: NextPage = () => {
  const router = useRouter();
  const [targetBand, setTargetBand] = useState<TargetBand | null>('6.5');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const { next } = router.query;
    return typeof next === 'string' ? next : '/dashboard';
  }, [router.query]);

  const currentIndex = useMemo(
    () => ONBOARDING_STEPS.findIndex((s) => s.id === 'target-band'),
    []
  );

  function handleBack() {
    router.push({
      pathname: STEP_ROUTES.language,
      query: { next: nextPath },
    });
  }

  function handleStepClick(stepId: OnboardingStepId) {
    const pathname = STEP_ROUTES[stepId];
    if (!pathname) return;

    router.push({
      pathname,
      query: { next: nextPath },
    });
  }

  async function handleContinue() {
    setError(null);

    if (!targetBand) {
      setError('Please choose a target band to continue.');
      return;
    }

    try {
      setSubmitting(true);

      // TODO: wire this to Supabase (profiles.goal_band / target_band)
      // await fetch('/api/onboarding/target-band', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ targetBand }),
      // });

      await router.push({
        pathname: STEP_ROUTES['exam-date'],
        query: { next: nextPath },
      });
    } catch (e) {
      setError('Something went wrong. Try again.');
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
            onStepClick={handleStepClick}
          />
        </div>

        <section className="w-full max-w-3xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                What band score are you aiming for?
              </h1>
              <p className="mt-2 text-muted-foreground">
                We’ll tailor your plan to hit this target.
              </p>
            </div>

            <div className="flex items-center gap-4 sm:ml-auto">
              <Button variant="ghost" disabled={submitting} onClick={handleBack}>
                <Icon name="arrow-left" className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                disabled={submitting || !targetBand}
                isLoading={submitting}
                onClick={handleContinue}
              >
                Continue
                <Icon name="arrow-right" className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TARGET_OPTIONS.map((option) => (
              <TargetBandCard
                key={option.id}
                option={option}
                selected={targetBand === option.id}
                onSelect={() => setTargetBand(option.id)}
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
  onStepClick?: (stepId: OnboardingStepId) => void;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  steps,
  currentIndex,
  onStepClick,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const completed = index < currentIndex;

          const circle = (
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
          );

          return (
            <div
              key={step.id}
              className="flex flex-1 items-center last:flex-none"
            >
              {onStepClick ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  className="flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {circle}
                </button>
              ) : (
                circle
              )}

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
          const label = (
            <span
              className={cn(
                'flex-1 truncate text-center',
                active && 'font-medium text-foreground'
              )}
            >
              {step.label}
            </span>
          );

          return (
            <button
              key={step.id}
              type="button"
              onClick={onStepClick ? () => onStepClick(step.id) : undefined}
              className="flex-1 focus-visible:outline-none"
              aria-label={`Go to ${step.label}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface TargetBandCardProps {
  option: TargetBandOption;
  selected: boolean;
  onSelect: () => void;
}

const TargetBandCard: React.FC<TargetBandCardProps> = ({
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
      aria-label={`Select ${option.label}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="target" className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold sm:text-lg">
            {option.label}
          </span>
        </div>

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

export default OnboardingTargetBandPage;