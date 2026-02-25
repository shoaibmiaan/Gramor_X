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

type Language = 'en' | 'ur';

const LANGUAGE_OPTIONS: { id: Language; label: string; subtitle: string }[] = [
  {
    id: 'en',
    label: 'English',
    subtitle: 'Use English throughout onboarding and your study plan.',
  },
  {
    id: 'ur',
    label: 'اردو (Urdu)',
    subtitle: 'Use Urdu where available while keeping IELTS terms in English.',
  },
];

const OnboardingLanguagePage: NextPage = () => {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const { next } = router.query;
    return typeof next === 'string' ? next : '/dashboard';
  }, [router.query]);

  async function handleContinue() {
    setError(null);

    try {
      setSubmitting(true);

      const res = await fetch('/api/onboarding/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });

      if (!res.ok) {
        let message = 'Failed to save language preference.';
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore parse failure
        }
        setError(message);
        return;
      }

      await router.push({
        pathname: '/onboarding/target-band',
        query: { next: nextPath },
      });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError(e?.message || 'Something went wrong while saving your language.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen flex-col items-center justify-center py-10">
        <div className="mb-6 w-full max-w-3xl">
          <OnboardingProgress steps={ONBOARDING_STEPS} currentIndex={0} />
        </div>

        <section className="w-full max-w-3xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step 1 of {ONBOARDING_STEPS.length}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Choose your language
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                We&apos;ll use this language in onboarding and personalize your
                study experience accordingly.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Icon name="languages" className="h-3.5 w-3.5" />
              Set your preferred experience.
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLanguage(option.id)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
                  language === option.id
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted'
                )}
              >
                <p className="text-base font-semibold sm:text-lg">{option.label}</p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  {option.subtitle}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          )}

          <footer className="mt-6 flex justify-end border-t border-border pt-4">
            <Button size="lg" onClick={handleContinue} disabled={submitting}>
              {submitting ? 'Saving…' : 'Continue'}
              <Icon name="arrow-right" className="ml-2 h-4 w-4" />
            </Button>
          </footer>
        </section>
      </Container>
    </main>
  );
};

const OnboardingProgress: React.FC<{
  steps: { id: OnboardingStepId; label: string }[];
  currentIndex: number;
}> = ({ steps, currentIndex }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const completed = index < currentIndex;

          return (
            <div key={step.id} className="flex flex-1 items-center last:flex-none">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                  completed && 'border-primary bg-primary text-primary-foreground',
                  active && !completed && 'border-primary/80 bg-primary/10 text-primary',
                  !active && !completed && 'border-border bg-muted text-muted-foreground'
                )}
              >
                {completed ? <Icon name="check" className="h-3.5 w-3.5" /> : index + 1}
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

export default OnboardingLanguagePage;
