// pages/onboarding/notifications.tsx
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
  language: '/onboarding',
  'target-band': '/onboarding/target-band',
  'exam-date': '/onboarding/exam-date',
  'study-rhythm': '/onboarding/study-rhythm',
  notifications: '/onboarding/notifications',
};

type ChannelId = 'email' | 'whatsapp' | 'in-app';

interface ChannelOption {
  id: ChannelId;
  label: string;
  description: string;
  badge?: string;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Daily/weekly summaries, test reminders, and progress reports.',
    badge: 'Recommended',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Short nudges, streak alerts, and quick links to practice.',
  },
  {
    id: 'in-app',
    label: 'In-app only',
    description: 'Silent mode. See reminders only inside GramorX.',
  },
];

const OnboardingNotificationsPage: NextPage = () => {
  const router = useRouter();

  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([
    'email',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Final destination after onboarding
  const nextPath = useMemo(() => {
    const { next } = router.query;
    const raw = typeof next === 'string' ? next : '/dashboard';

    // never loop back into onboarding from final step
    if (!raw || raw.startsWith('/onboarding')) {
      return '/dashboard';
    }
    return raw;
  }, [router.query]);

  const currentIndex = useMemo(
    () => ONBOARDING_STEPS.findIndex((s) => s.id === 'notifications'),
    []
  );

  const hasChannel = selectedChannels.length > 0;

  function toggleChannel(id: ChannelId) {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleStepClick(stepId: OnboardingStepId) {
    const pathname = STEP_ROUTES[stepId];
    if (!pathname) return;

    router.push({
      pathname,
      query: { next: nextPath },
    });
  }

  function handleBack() {
    router.push({
      pathname: STEP_ROUTES['study-rhythm'],
      query: { next: nextPath },
    });
  }

  async function handleFinish() {
    setError(null);

    if (!hasChannel) {
      setError('Pick at least one way for us to remind you.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 5,
          channels: selectedChannels,
        }),
      });

      if (!res.ok) {
        // don’t block navigation forever if server is grumpy;
        // but still show error text
        let msg = 'Failed to save onboarding.';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          // ignore JSON parse issues
        }
        setError(msg);
        return;
      }

      await router.push(nextPath || '/dashboard');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError(
        e?.message || 'Could not save your notification settings. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen flex-col items-center justify-center py-10">
        {/* Progress (clickable) */}
        <div className="mb-6 w-full max-w-3xl">
          <OnboardingProgress
            steps={ONBOARDING_STEPS}
            currentIndex={currentIndex}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Card */}
        <section className="w-full max-w-3xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                How should we keep you on track?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Choose where you want to receive study nudges, streak alerts,
                and mock test reminders. No spam — only what helps your band
                score.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Icon name="bell" className="h-3.5 w-3.5" />
              Smart reminders, not noise.
            </div>
          </header>

          {/* Channels */}
          <div className="grid gap-4 sm:grid-cols-3">
            {CHANNEL_OPTIONS.map((option) => (
              <ChannelCard
                key={option.id}
                option={option}
                selected={selectedChannels.includes(option.id)}
                onToggle={() => toggleChannel(option.id)}
              />
            ))}
          </div>

          {error && (
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          )}

          <p className="mt-4 text-xs text-muted-foreground sm:text-sm">
            You can fine-tune these later from{' '}
            <span className="font-medium">Settings → Notifications</span>.
          </p>

          {/* Footer */}
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
                Finish and go to{' '}
                <span className="font-medium">
                  {nextPath === '/dashboard' ? 'dashboard' : nextPath}
                </span>
              </p>
              <Button
                size="lg"
                onClick={handleFinish}
                disabled={submitting || !hasChannel}
              >
                {submitting ? 'Finishing…' : 'Finish & continue'}
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
  onStepClick?: (id: OnboardingStepId) => void;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  steps,
  currentIndex,
  onStepClick,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Rail */}
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
                !active &&
                  !completed &&
                  'border-border bg-muted text-muted-foreground'
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

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {steps.map((step, index) => {
          const active = index === currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={onStepClick ? () => onStepClick(step.id) : undefined}
              className="flex-1 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'flex-1 truncate text-center',
                  active && 'font-medium text-foreground'
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ChannelCardProps {
  option: ChannelOption;
  selected: boolean;
  onToggle: () => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  option,
  selected,
  onToggle,
}) => {
  const { label, description, badge } = option;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="bell" className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold sm:text-lg">{label}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
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

      {badge && (
        <span className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
    </button>
  );
};

export default OnboardingNotificationsPage;
