// pages/onboarding/index.tsx
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

type LanguageCode = 'en' | 'ur';

const OnboardingLanguagePage: NextPage = () => {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageCode | null>('en');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const { next } = router.query;
    // we keep whatever you passed in ?next=, but fall back to dashboard after flow
    return typeof next === 'string' ? next : '/dashboard';
  }, [router.query]);

  const currentIndex = useMemo(
    () => ONBOARDING_STEPS.findIndex((s) => s.id === 'language'),
    []
  );

  async function handleContinue() {
    setError(null);

    if (!language) {
      setError('Please pick a language to continue.');
      return;
    }

    try {
      setSubmitting(true);

      // TODO: wire this up to your actual API / Supabase call.
      // Example (pseudo):
      // await fetch('/api/onboarding/language', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ language }),
      // });

      // For now, just move to the next onboarding step route.
      await router.push({
        pathname: '/onboarding/target-band',
        query: { next: nextPath },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    // First step: go back to login/signup if someone hits Back
    router.back();
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
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Pick your learning language
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                We&apos;ll translate nudges, reminders, and key instructions so
                the platform feels natural to you. You can change this later
                from <span className="font-medium">Settings → Preferences</span>.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:flex">
              <Icon name="zap" className="h-3.5 w-3.5" />
              Smart setup · under 1 minute
            </div>
          </header>

          {/* Choices */}
          <div className="grid gap-4 sm:grid-cols-2">
            <LanguageChoice
              code="en"
              label="English"
              description="Interface, reminders, and lessons in English."
              selected={language === 'en'}
              onSelect={() => setLanguage('en')}
            />
            <LanguageChoice
              code="ur"
              label="اردو + English mix"
              description="Interface in Urdu with IELTS practice mostly kept bilingual."
              selected={language === 'ur'}
              onSelect={() => setLanguage('ur')}
            />
          </div>

          {error && (
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          )}

          {/* Keyboard hint */}
          <p className="mt-4 text-xs text-muted-foreground">
            Tip: Use <span className="rounded bg-muted px-1.5 py-0.5">←</span>{' '}
            and <span className="rounded bg-muted px-1.5 py-0.5">→</span>{' '}
            arrow keys to move between options, then press{' '}
            <span className="rounded bg-muted px-1.5 py-0.5">Enter</span> to
            continue.
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
                Next: <span className="font-medium">Set your target band</span>
              </p>
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={submitting || !language}
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

interface LanguageChoiceProps {
  code: LanguageCode;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

const LanguageChoice: React.FC<LanguageChoiceProps> = ({
  label,
  description,
  selected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex h-full flex-col rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {label.charAt(0)}
          </span>
          <span className="text-base font-semibold sm:text-lg">{label}</span>
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

      <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
    </button>
  );
};

export default OnboardingLanguagePage;
