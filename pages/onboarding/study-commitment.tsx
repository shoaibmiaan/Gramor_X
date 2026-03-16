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

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function StudyCommitmentPage() {
  const router = useRouter();
  const nav = resolveNavigation('study-commitment');
  const [studyDays, setStudyDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [minutesPerDay, setMinutes] = useState(45);

  useEffect(() => {
    const d = loadDraft('study-commitment', {
      studyDays: ['mon', 'wed', 'fri'],
      minutesPerDay: 45,
    });
    setStudyDays(d.studyDays);
    setMinutes(d.minutesPerDay);
  }, []);

  useEffect(() => {
    saveDraft('study-commitment', { studyDays, minutesPerDay });
  }, [studyDays, minutesPerDay]);

  const toggleDay = (day: string) => {
    setStudyDays((prev) => (prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day]));
  };

  const payload = { studyDays, minutesPerDay };
  const { isValid, errors } = useStepValidation(7, payload);

  const { isSaving, isSaved, error, flush } = useAutoSave({
    step: 7,
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
      title="How much can you study?"
      subtitle="Pick your weekly days and average minutes per day."
      step={nav.index + 1}
      total={nav.total}
      onBack={() => nav.prev && router.push(nav.prev.path)}
      statusIndicator={<SavingIndicator isSaving={isSaving} isSaved={isSaved} error={error} />}
      footer={
        <Button disabled={!isValid} onClick={handleContinue}>
          Continue
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => toggleDay(day)}
            className={`rounded-lg border px-2 py-2 text-sm uppercase ${
              studyDays.includes(day) ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      <ValidationError message={errors.studyDays} />

      <label className="text-sm font-medium">Minutes per day</label>
      <input
        type="range"
        min={10}
        max={180}
        step={5}
        value={minutesPerDay}
        onChange={(e) => setMinutes(Number(e.target.value))}
        className="mt-2 w-full"
      />
      <p className="mt-1 text-sm text-muted-foreground">{minutesPerDay} minutes/day</p>
      <ValidationError message={errors.minutesPerDay || errors._form} />
    </StepLayout>
  );
}
