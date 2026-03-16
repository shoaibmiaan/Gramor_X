import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { ValidationError } from '@/components/ui/ValidationError';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStepValidation } from '@/hooks/useStepValidation';
import { resolveNavigation } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export default function CurrentLevelPage() {
  const router = useRouter();
  const nav = resolveNavigation('current-level');
  const [currentLevel, setLevel] = useState<(typeof levels)[number]>('B1');

  useEffect(() => {
    const d = loadDraft('current-level', { currentLevel: 'B1' as const });
    setLevel(d.currentLevel);
  }, []);

  useEffect(() => {
    saveDraft('current-level', { currentLevel });
  }, [currentLevel]);

  const payload = { currentLevel };
  const { isValid, errors } = useStepValidation(3, payload);

  const { isSaving, isSaved, error, flush } = useAutoSave({
    step: 3,
    data: payload,
    enabled: isValid,
  });

  const handleContinue = async () => {
    await flush();
    if (nav.next) await router.push(nav.next.path);
  };

  return (
    <StepLayout
      title="What's your current English level?"
      subtitle="Choose your best estimate. We'll calibrate plan difficulty from here."
      step={nav.index + 1}
      total={nav.total}
      onBack={() => nav.prev && router.push(nav.prev.path)}
      statusIndicator={<SavingIndicator isSaving={isSaving} isSaved={isSaved} error={error} />}
      footer={
        <Button onClick={handleContinue} disabled={!isValid}>
          Continue
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => setLevel(level)}
            className={`rounded-xl border p-4 text-left transition ${
              currentLevel === level
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/40'
            }`}
          >
            <p className="text-lg font-semibold">{level}</p>
            <p className="text-xs text-muted-foreground">CEFR level</p>
          </button>
        ))}
      </div>
      <ValidationError message={errors.currentLevel} />
    </StepLayout>
  );
}
