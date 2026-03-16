// pages/onboarding/target-band.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { ValidationError } from '@/components/ui/ValidationError';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStepValidation } from '@/hooks/useStepValidation';
import { ONBOARDING_STEPS, getNextStep, getPrevStep, getStepIndex } from '@/lib/onboarding/steps';
import { cn } from '@/lib/utils';

type TargetBand = '5.5' | '6.0' | '6.5' | '7.0' | '7.5+';

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

  const nextPath = useMemo(() => {
    const { next } = router.query;
    return typeof next === 'string' ? next : '/dashboard';
  }, [router.query]);

  const currentIndex = getStepIndex('target-band');

  function handleBack() {
    const prev = getPrevStep('target-band');
    if (prev) {
      router.push({
        pathname: prev.path,
        query: { next: nextPath },
      });
    }
  }

  const goalBand = targetBand ? Number.parseFloat(targetBand) : null;
  const payload = { goalBand };
  const { isValid, errors } = useStepValidation(5, payload);

  const {
    isSaving,
    isSaved,
    error: autoSaveError,
    flush,
  } = useAutoSave({
    step: 5,
    data: payload,
    enabled: goalBand !== null && isValid,
  });

  async function handleContinue() {
    if (!targetBand || !isValid) return;

    try {
      setSubmitting(true);
      await flush();

      const next = getNextStep('target-band');
      if (next) {
        await router.push({
          pathname: next.path,
          query: { next: nextPath },
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepLayout
      title="Target IELTS Band"
      subtitle="Your goal band helps us set difficulty, pick question types, and plan how aggressive your schedule should be."
      step={currentIndex + 1}
      total={ONBOARDING_STEPS.length}
      onBack={handleBack}
      statusIndicator={
        <SavingIndicator
          isSaving={isSaving || submitting}
          isSaved={isSaved}
          error={autoSaveError}
        />
      }
      footer={
        <Button size="lg" onClick={handleContinue} disabled={submitting || !isValid || !targetBand}>
          {submitting ? 'Saving…' : 'Continue'}
          <Icon name="arrow-right" className="ml-2 h-4 w-4" />
        </Button>
      }
    >
      <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <Icon name="target" className="h-3.5 w-3.5" />
        Clear goal, clearer path.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TARGET_OPTIONS.map((option) => (
          <TargetBandCard
            key={option.id}
            option={option}
            selected={targetBand === option.id}
            onSelect={() => setTargetBand(option.id)}
          />
        ))}
      </div>
      <ValidationError message={errors.goalBand || errors._form} />

      <p className="mt-4 text-xs text-muted-foreground">
        Not 100% sure? Pick the band you’d be happy with. You can always adjust it later from{' '}
        <span className="font-medium">Profile → Goals</span>.
      </p>

      <p className="mt-4 hidden text-xs text-muted-foreground sm:block">
        Next: <span className="font-medium">Exam timeline</span>
      </p>
    </StepLayout>
  );
};

interface TargetBandCardProps {
  option: TargetBandOption;
  selected: boolean;
  onSelect: () => void;
}

const TargetBandCard: React.FC<TargetBandCardProps> = ({ option, selected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="target" className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold sm:text-lg">{option.label}</span>
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

      <p className="text-xs text-muted-foreground sm:text-sm">{option.subtitle}</p>

      {option.badge && (
        <span className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {option.badge}
        </span>
      )}
    </button>
  );
};

export default OnboardingTargetBandPage;
