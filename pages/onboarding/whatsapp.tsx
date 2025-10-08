// pages/onboarding/whatsapp.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import StepShell from '@/components/onboarding/StepShell';
import { Checkbox } from '@/components/design-system/Checkbox';
import { completeOnboarding, markStep, persistDraft, readDraft, skipOnboarding } from '@/lib/onboarding';

const STEPS = [
  { label: 'Target Band', href: '/onboarding/goal', done: true },
  { label: 'Exam Date', href: '/onboarding/date', done: true },
  { label: 'WhatsApp Updates', href: '/onboarding/whatsapp' },
];

function formatDate(value?: string) {
  if (!value) return 'Not set';
  try {
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return 'Not set';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
  } catch {
    return 'Not set';
  }
}

export default function WhatsappStep() {
  const router = useRouter();
  const [optIn, setOptIn] = React.useState(true);
  const [goal, setGoal] = React.useState<string>('');
  const [examDate, setExamDate] = React.useState<string | undefined>(undefined);
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    markStep('whatsapp');
    const draft = readDraft();
    if (draft.goalBand) setGoal(draft.goalBand.toFixed(1));
    if (draft.examDate) setExamDate(draft.examDate);
    if (draft.whatsappOptIn != null) setOptIn(draft.whatsappOptIn);
  }, []);

  React.useEffect(() => {
    persistDraft({ whatsappOptIn: optIn });
  }, [optIn]);

  const finish = async () => {
    const goalValue = Number(goal);
    if (!goal || Number.isNaN(goalValue)) {
      setError('Please set your target band before finishing.');
      return;
    }
    try {
      setStatus('saving');
      setError(null);
      await completeOnboarding({ goalBand: goalValue, examDate: examDate ?? null, whatsappOptIn: optIn });
      await router.replace('/dashboard');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save onboarding details.');
    } finally {
      setStatus((prev) => (prev === 'saving' ? 'idle' : prev));
    }
  };

  const skip = async () => {
    try {
      setStatus('saving');
      setError(null);
      await skipOnboarding();
      await router.replace('/dashboard');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not skip onboarding.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepShell
        step={3}
        total={3}
        title="Stay in the loop"
        subtitle="Get gentle nudges and mock-test reminders over WhatsApp so you never miss a study session."
        onBack={() => router.push('/onboarding/date')}
        onNext={finish}
        onSkip={skip}
        skipLabel="Skip for now"
        nextLabel={status === 'saving' ? 'Saving…' : 'Finish'}
        nextDisabled={status === 'saving'}
        steps={STEPS}
        hint="You can update notification preferences anytime from Settings › Notifications."
      >
        <div className="grid gap-4">
          <section className="rounded-ds-xl border border-border bg-card/60 p-4" aria-labelledby="onboarding-summary">
            <h2 id="onboarding-summary" className="text-small font-semibold uppercase tracking-wide text-mutedText">
              Summary
            </h2>
            <dl className="mt-3 space-y-2 text-small">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mutedText">Target band</dt>
                <dd className="font-semibold">{goal || 'Not set'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mutedText">Exam date</dt>
                <dd className="font-semibold">{formatDate(examDate)}</dd>
              </div>
            </dl>
          </section>

          <label className="flex items-start gap-3 rounded-ds-xl border border-border bg-card/60 p-4">
            <Checkbox checked={optIn} onCheckedChange={(checked) => setOptIn(Boolean(checked))} />
            <div>
              <div className="font-medium">Send me WhatsApp study reminders</div>
              <p className="text-small text-mutedText">
                Expect 2–3 nudges per week, including AI score summaries and mock-test windows. You can opt out anytime.
              </p>
            </div>
          </label>

          <div
            role="status"
            aria-live="polite"
            className="text-small text-mutedText"
          >
            {status === 'saving' && 'Saving your preferences…'}
            {status === 'error' && error}
          </div>
        </div>
      </StepShell>
    </div>
  );
}
