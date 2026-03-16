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

const options = [
  ['within_1_month', 'Within 1 month'],
  ['within_3_months', 'Within 3 months'],
  ['within_6_months', 'Within 6 months'],
  ['not_scheduled', 'Not scheduled yet'],
] as const;

export default function ExamTimelinePage() {
  const router = useRouter();
  const nav = resolveNavigation('exam-timeline');
  const [timeframe, setTimeframe] = useState('within_3_months');
  const [examDate, setExamDate] = useState('');

  useEffect(() => {
    const d = loadDraft('exam-timeline', { timeframe: 'within_3_months', examDate: '' });
    setTimeframe(d.timeframe);
    setExamDate(d.examDate);
  }, []);

  useEffect(() => {
    saveDraft('exam-timeline', { timeframe, examDate });
  }, [timeframe, examDate]);

  const payload = { timeframe, examDate: examDate || null };
  const { isValid, errors } = useStepValidation(6, payload);

  const { isSaving, isSaved, error, flush } = useAutoSave({
    step: 6,
    data: payload,
    enabled: isValid,
  });

  const handleContinue = async () => {
    if (!isValid) return;
    await flush();
    if (nav.next) await router.push(nav.next.path);
  };

  return (
    <StepLayout
      title="When is your exam?"
      subtitle="We use this to build a realistic timeline."
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
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTimeframe(value)}
            className={`rounded-xl border p-4 text-left ${
              timeframe === value ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ValidationError message={errors.timeframe} />

      <input
        type="date"
        className="mt-4 w-full rounded-xl border p-3 sm:w-auto"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
      />
      <ValidationError message={errors.examDate || errors._form} />
    </StepLayout>
  );
}
