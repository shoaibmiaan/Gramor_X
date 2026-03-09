import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';
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
  useEffect(() => saveDraft('current-level', { currentLevel }), [currentLevel]);

  return (
    <StepLayout title="What's your current English level?" subtitle="Choose your best estimate. We'll calibrate plan difficulty from here." step={nav.index + 1} total={nav.total} onBack={() => nav.prev && router.push(nav.prev.path)} footer={<Button onClick={async()=>{await saveOnboardingStep(3,{ currentLevel }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {levels.map((l) => (
          <button key={l} onClick={() => setLevel(l)} className={`rounded-xl border p-4 text-left transition ${currentLevel===l?'border-primary bg-primary/10':'border-border hover:bg-muted/40'}`}>
            <p className="text-lg font-semibold">{l}</p>
            <p className="text-xs text-muted-foreground">CEFR level</p>
          </button>
        ))}
      </div>
    </StepLayout>
  );
}
