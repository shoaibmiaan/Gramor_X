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
import { resolveNavigation, saveOnboardingStep, skipOnboardingStep } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

type DiagnosticResult = {
  grammar: string;
  coherence: string;
  vocabulary: string;
  estimated_band: number;
};

export default function DiagnosticPage() {
  const router = useRouter();
  const nav = resolveNavigation('diagnostic');
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    const d = loadDraft('diagnostic', { response: '' });
    setResponse(d.response);
  }, []);

  useEffect(() => {
    saveDraft('diagnostic', { response, result });
  }, [response, result]);

  const payload = { response, result: result ?? undefined };
  const { isValid, errors, canSkip } = useStepValidation(11, payload);

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
    step: 11,
    data: payload,
    enabled: isValid,
  });

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Diagnostic failed');

      setResult(body as DiagnosticResult);
      await saveOnboardingStep(11, { response, result: body }, { expectedVersion });
    } catch (e: any) {
      setError(e?.message || 'Could not run diagnostic');
    } finally {
      setLoading(false);
    }
  };

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
      await skipOnboardingStep(11, { expectedVersion });
      await router.push(nav.next.path);
    } finally {
      setSkipping(false);
    }
  };

  return (
    <StepLayout
      title="Quick writing diagnostic"
      subtitle="Write 80+ words about your IELTS goal. We’ll estimate your current band."
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
          isSaving={isSaving || loading || skipping}
          isSaved={isSaved}
          error={autoSaveError || error}
          syncState={syncState}
          onRetry={() => void retry()}
        />
      }
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={loading || response.length < 20 || skipping}
            onClick={() => void runDiagnostic()}
          >
            {loading ? 'Analyzing…' : 'Run diagnostic'}
          </Button>
          {result && (
            <Button onClick={() => void handleContinue()} disabled={!isValid || skipping}>
              Continue
            </Button>
          )}
        </div>
      }
    >
      <textarea
        className="min-h-40 w-full rounded-xl border p-3"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Tell us about your IELTS goal, challenges, and target score..."
      />
      <ValidationError message={errors.response} />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mt-4 grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm sm:grid-cols-2">
          <p>
            <strong>Estimated band:</strong> {result.estimated_band.toFixed(1)}
          </p>
          <p>
            <strong>Grammar:</strong> {result.grammar}
          </p>
          <p>
            <strong>Coherence:</strong> {result.coherence}
          </p>
          <p>
            <strong>Vocabulary:</strong> {result.vocabulary}
          </p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Draft saves automatically while typing.</p>
    </StepLayout>
  );
}
