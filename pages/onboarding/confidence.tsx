import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { ConflictDialog } from '@/components/onboarding/ConflictDialog';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { ValidationError } from '@/components/ui/ValidationError';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStepValidation } from '@/hooks/useStepValidation';
import { resolveNavigation, skipOnboardingStep } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

export default function ConfidencePage() {
  const router = useRouter();
  const nav = resolveNavigation('confidence');
  const [writing, setWriting] = useState(3);
  const [speaking, setSpeaking] = useState(3);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    const d = loadDraft('confidence', { writing: 3, speaking: 3 });
    setWriting(d.writing);
    setSpeaking(d.speaking);
  }, []);

  useEffect(() => {
    saveDraft('confidence', { writing, speaking });
  }, [writing, speaking]);

  const payload = { writing, speaking };
  const { isValid, errors, canSkip } = useStepValidation(10, payload);

  const {
    isSaving,
    isSaved,
    error: autoSaveError,
    flush,
    retry,
    hasPendingChanges,
    syncState,
    expectedVersion,
    isConflict,
    conflictMessage,
    reloadFromConflict,
  } = useAutoSave({
    step: 10,
    data: payload,
    enabled: isValid,
  });

  const handleContinue = async () => {
    if (!isValid) return;
    const didSave = await flush();
    if (!didSave) return;
    if (nav.next) await router.push(nav.next.path);
  };

  const handleSkip = async () => {
    if (!canSkip || !nav.next) return;
    try {
      setSkipping(true);
      await skipOnboardingStep(10, { expectedVersion });
      await router.push(nav.next.path);
    } finally {
      setSkipping(false);
    }
  };

  return (
    <StepLayout
      title="How confident are you today?"
      subtitle="Rate from 1 (low) to 5 (high)."
      step={nav.index + 1}
      total={nav.total}
      onBack={() => nav.prev && router.push(nav.prev.path)}
      showSkip={canSkip}
      onSkip={handleSkip}
      conflictBanner={
        isConflict && conflictMessage ? (
          <ConflictDialog message={conflictMessage} onReload={reloadFromConflict} />
        ) : undefined
      }
      errorAlert={
        hasPendingChanges && autoSaveError ? (
          <ErrorAlert message={autoSaveError} onRetry={() => void retry()} />
        ) : undefined
      }
      statusIndicator={
        <SavingIndicator
          isSaving={isSaving || skipping}
          isSaved={isSaved}
          error={autoSaveError}
          syncState={syncState}
          onRetry={() => void retry()}
        />
      }
      footer={
        <Button onClick={handleContinue} disabled={!isValid || skipping}>
          Continue
        </Button>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1 block font-medium">Writing confidence: {writing}/5</span>
          <input
            className="w-full"
            type="range"
            min={1}
            max={5}
            value={writing}
            onChange={(e) => setWriting(Number(e.target.value))}
          />
          <ValidationError message={errors.writing} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Speaking confidence: {speaking}/5</span>
          <input
            className="w-full"
            type="range"
            min={1}
            max={5}
            value={speaking}
            onChange={(e) => setSpeaking(Number(e.target.value))}
          />
          <ValidationError message={errors.speaking} />
        </label>
      </div>
    </StepLayout>
  );
}
