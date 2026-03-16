import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import { resolveNavigation } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

const styles = [
  ['visual', 'Visual (charts, diagrams)'],
  ['auditory', 'Auditory (listening & speaking)'],
  ['reading_writing', 'Reading/Writing'],
  ['kinesthetic', 'Hands-on practice'],
  ['mixed', 'Mixed'],
] as const;

export default function LearningStylePage() {
  const router = useRouter();
  const nav = resolveNavigation('learning-style');
  const [learningStyle, setLearningStyle] = useState<(typeof styles)[number][0]>('mixed');

  useEffect(() => {
    const d = loadDraft('learning-style', { learningStyle: 'mixed' as const });
    setLearningStyle(d.learningStyle);
  }, []);

  useEffect(() => {
    saveDraft('learning-style', { learningStyle });
  }, [learningStyle]);

  const { isSaving, isSaved, error, flush } = useAutoSave({
    step: 8,
    data: { learningStyle },
  });

  const handleContinue = async () => {
    await flush();
    if (nav.next) await router.push(nav.next.path);
  };

  return (
    <StepLayout
      title="What learning style suits you?"
      subtitle="We'll tune exercises and explanations to your preference."
      step={nav.index + 1}
      total={nav.total}
      onBack={() => nav.prev && router.push(nav.prev.path)}
      statusIndicator={<SavingIndicator isSaving={isSaving} isSaved={isSaved} error={error} />}
      footer={<Button onClick={handleContinue}>Continue</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {styles.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setLearningStyle(value)}
            className={`rounded-xl border p-4 text-left ${
              learningStyle === value ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </StepLayout>
  );
}
