import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { ValidationError } from '@/components/ui/ValidationError';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStepValidation } from '@/hooks/useStepValidation';
import { resolveNavigation } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

export default function PreviousIeltsPage() {
  const router = useRouter();
  const nav = resolveNavigation('previous-ielts');
  const [taken, setTaken] = useState(false);
  const [overallBand, setBand] = useState('6.0');
  const [testDate, setDate] = useState('');

  useEffect(() => {
    const d = loadDraft('previous-ielts', { taken: false, overallBand: '6.0', testDate: '' });
    setTaken(d.taken);
    setBand(d.overallBand);
    setDate(d.testDate);
  }, []);

  useEffect(() => {
    saveDraft('previous-ielts', { taken, overallBand, testDate });
  }, [taken, overallBand, testDate]);

  const payload = {
    taken,
    overallBand: taken ? Number(overallBand) : null,
    testDate: taken ? testDate || null : null,
  };
  const { isValid, errors } = useStepValidation(4, payload);

  const {
    isSaving,
    isSaved,
    error: autoSaveError,
    flush,
    retry,
    hasPendingChanges,
    syncState,
  } = useAutoSave({
    step: 4,
    data: payload,
    enabled: isValid,
  });

  const handleContinue = async () => {
    if (!isValid) return;
    const didSave = await flush();
    if (!didSave) return;
    if (nav.next) await router.push(nav.next.path);
  };

  return (
    <StepLayout
      title="Have you taken IELTS before?"
      subtitle="Past attempts help us estimate your starting point."
      step={nav.index + 1}
      total={nav.total}
      onBack={() => nav.prev && router.push(nav.prev.path)}
      errorAlert={
        hasPendingChanges && autoSaveError ? (
          <ErrorAlert message={autoSaveError} onRetry={() => void retry()} />
        ) : undefined
      }
      statusIndicator={
        <SavingIndicator
          isSaving={isSaving}
          isSaved={isSaved}
          error={autoSaveError}
          syncState={syncState}
          onRetry={() => void retry()}
        />
      }
      footer={
        <Button onClick={handleContinue} disabled={!isValid}>
          Continue
        </Button>
      }
    >
      <label className="flex items-center gap-2 rounded-xl border border-border p-4">
        <input type="checkbox" checked={taken} onChange={(e) => setTaken(e.target.checked)} /> Yes,
        I&apos;ve taken IELTS
      </label>

      {taken && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <input
              className="w-full rounded-xl border p-3"
              value={overallBand}
              onChange={(e) => setBand(e.target.value)}
              placeholder="Overall band (e.g. 6.0)"
            />
            <ValidationError message={errors.overallBand} />
          </div>
          <div>
            <input
              type="date"
              className="w-full rounded-xl border p-3"
              value={testDate}
              onChange={(e) => setDate(e.target.value)}
            />
            <ValidationError message={errors.testDate} />
          </div>
        </div>
      )}

      <ValidationError message={errors._form} />
      <p className="mt-3 text-xs text-muted-foreground">
        Draft saved automatically on this device.
      </p>
    </StepLayout>
  );
}
