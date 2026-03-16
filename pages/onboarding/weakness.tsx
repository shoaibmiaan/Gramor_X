import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import { resolveNavigation } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

const options = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'];

export default function WeaknessPage() {
  const router = useRouter();
  const nav = resolveNavigation('weakness');
  const [weaknesses, setWeaknesses] = useState<string[]>(['writing']);

  useEffect(() => {
    const d = loadDraft('weakness', { weaknesses: ['writing'] });
    setWeaknesses(d.weaknesses);
  }, []);

  useEffect(() => {
    saveDraft('weakness', { weaknesses });
  }, [weaknesses]);

  const toggle = (value: string) => {
    setWeaknesses((prev) =>
      prev.includes(value)
        ? prev.filter((x) => x !== value)
        : prev.length < 3
          ? [...prev, value]
          : prev,
    );
  };

  const { isSaving, isSaved, error, flush } = useAutoSave({
    step: 9,
    data: { weaknesses },
    enabled: weaknesses.length > 0,
  });

  const handleContinue = async () => {
    if (!weaknesses.length) return;
    await flush();
    if (nav.next) await router.push(nav.next.path);
  };

  return (
    <StepLayout
      title="Where do you struggle most?"
      subtitle="Pick up to 3 areas. We'll prioritize them in your daily plan."
      step={nav.index + 1}
      total={nav.total}
      onBack={() => nav.prev && router.push(nav.prev.path)}
      statusIndicator={<SavingIndicator isSaving={isSaving} isSaved={isSaved} error={error} />}
      footer={
        <Button disabled={!weaknesses.length} onClick={handleContinue}>
          Continue
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option}
            className={`rounded-xl border p-3 text-left capitalize ${
              weaknesses.includes(option) ? 'border-primary bg-primary/10' : 'border-border'
            }`}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Selected: {weaknesses.length}/3</p>
    </StepLayout>
  );
}
