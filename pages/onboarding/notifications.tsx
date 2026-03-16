// pages/onboarding/notifications.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { ValidationError } from '@/components/ui/ValidationError';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ONBOARDING_STEPS, getPrevStep, getStepIndex } from '@/lib/onboarding/steps';
import { cn } from '@/lib/utils';
import {
  NOTIFICATION_CHANNELS_IN_DISPLAY_ORDER,
  TOTAL_ONBOARDING_STEPS,
  type NotificationChannel,
} from '@/lib/onboarding/schema';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStepValidation } from '@/hooks/useStepValidation';

type ChannelId = NotificationChannel;

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
    id: 'in_app',
    label: 'In-app only',
    description: 'Silent mode. See reminders only inside GramorX.',
  },
];

const OnboardingNotificationsPage: NextPage = () => {
  const router = useRouter();

  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([
    NOTIFICATION_CHANNELS_IN_DISPLAY_ORDER[0],
  ]);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(() => {
    const { next } = router.query;
    const raw = typeof next === 'string' ? next : '/onboarding/study-plan';

    if (!raw) {
      return '/onboarding/study-plan';
    }

    if (raw.startsWith('/onboarding') && raw !== '/onboarding/study-plan') {
      return '/onboarding/study-plan';
    }
    return raw;
  }, [router.query]);

  const currentIndex = getStepIndex('notifications');
  const hasChannel = selectedChannels.length > 0;

  function toggleChannel(id: ChannelId) {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function handleBack() {
    const prev = getPrevStep('notifications');
    if (prev) {
      router.push({
        pathname: prev.path,
        query: { next: nextPath },
      });
    }
  }

  const payload = {
    channels: NOTIFICATION_CHANNELS_IN_DISPLAY_ORDER.filter((channel) =>
      selectedChannels.includes(channel),
    ),
  };
  const { isValid, errors } = useStepValidation(TOTAL_ONBOARDING_STEPS, payload);

  const {
    isSaving,
    isSaved,
    error: autoSaveError,
    flush,
    retry,
    hasPendingChanges,
    syncState,
  } = useAutoSave({
    step: TOTAL_ONBOARDING_STEPS,
    data: payload,
    enabled: hasChannel && isValid,
  });

  async function handleComplete() {
    if (!hasChannel || !isValid) return;

    try {
      setSubmitting(true);
      await flush();
      await router.push(nextPath || '/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepLayout
      title="Notifications"
      subtitle="Choose how you want to receive updates"
      step={currentIndex + 1}
      total={ONBOARDING_STEPS.length}
      onBack={handleBack}
      errorAlert={
        hasPendingChanges && autoSaveError ? (
          <ErrorAlert message={autoSaveError} onRetry={() => void retry()} />
        ) : undefined
      }
      statusIndicator={
        <SavingIndicator
          isSaving={isSaving || submitting}
          isSaved={isSaved}
          error={autoSaveError}
          syncState={syncState}
          onRetry={() => void retry()}
        />
      }
      footer={
        <Button size="lg" onClick={handleComplete} disabled={submitting || !hasChannel || !isValid}>
          {submitting ? 'Finishing…' : 'Complete onboarding'}
          <Icon name="arrow-right" className="ml-2 h-4 w-4" />
        </Button>
      }
    >
      <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <Icon name="bell" className="h-3.5 w-3.5" />
        Smart reminders, not noise.
      </div>

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
      <ValidationError message={errors.channels || errors._form} />

      <p className="mt-4 text-xs text-muted-foreground sm:text-sm">
        You can fine-tune these later from{' '}
        <span className="font-medium">Settings → Notifications</span>.
      </p>

      <p className="mt-4 hidden text-xs text-muted-foreground sm:block">
        Finish and go to{' '}
        <span className="font-medium">
          {nextPath === '/onboarding/study-plan' ? 'your AI study plan' : nextPath}
        </span>
      </p>
    </StepLayout>
  );
};

interface ChannelCardProps {
  option: ChannelOption;
  selected: boolean;
  onToggle: () => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ option, selected, onToggle }) => {
  const { label, description, badge } = option;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted',
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
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{description}</p>
        </div>

        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground group-hover:border-primary/70',
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
