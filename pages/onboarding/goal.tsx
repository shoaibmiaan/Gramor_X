// pages/onboarding/goal.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import StepShell from '@/components/onboarding/StepShell';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { markStep, persistDraft, readDraft } from '@/lib/onboarding';

const STEPS = [
  { label: 'Target Band', href: '/onboarding/goal', done: true },
  { label: 'Exam Date', href: '/onboarding/date' },
  { label: 'WhatsApp Updates', href: '/onboarding/whatsapp' },
] as const;

const quickBands = ['6.5', '7.0', '7.5', '8.0'];

export default function OnboardingGoal() {
  const router = useRouter();
  const [goal, setGoal] = React.useState<string>('7.0');

  React.useEffect(() => {
    markStep('band');
    const draft = readDraft();
    if (draft.goalBand) setGoal(draft.goalBand.toFixed(1));
  }, []);

  React.useEffect(() => {
    const value = Number(goal);
    if (!Number.isNaN(value)) persistDraft({ goalBand: value });
  }, [goal]);

  const next = () => router.push('/onboarding/date');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepShell
        step={1}
        total={3}
        title="Your Target Band"
        subtitle="Pick the overall band you’re aiming for. You can adjust later."
        onNext={next}
        nextLabel="Continue"
        steps={STEPS}
        hint="Aim 0.5 higher than required — it helps counter exam-day variability."
      >
        <div className="grid gap-4">
          <Input
            type="number"
            step="0.5"
            min="4"
            max="9"
            label="Target Band"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {quickBands.map((q) => (
              <Button key={q} type="button" variant="ghost" className="rounded-ds-xl" onClick={() => setGoal(q)}>
                {q}
              </Button>
            ))}
          </div>
          <p className="text-small text-mutedText">
            Many universities accept 6.5–7.0. Choosing slightly higher keeps a healthy buffer.
          </p>
        </div>
      </StepShell>
    </div>
  );
}
// pages/onboarding/goal.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import StepShell from '@/components/onboarding/StepShell';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { markStep, persistDraft, readDraft } from '@/lib/onboarding';

const STEPS = [
  { label: 'Target Band', href: '/onboarding/goal', done: true },
  { label: 'Exam Date', href: '/onboarding/date' },
  { label: 'WhatsApp Updates', href: '/onboarding/whatsapp' },
] as const;

const quickBands = ['6.5', '7.0', '7.5', '8.0'];

export default function OnboardingGoal() {
  const router = useRouter();
  const [goal, setGoal] = React.useState<string>('7.0');

  React.useEffect(() => {
    markStep('band');
    const draft = readDraft();
    if (draft.goalBand) setGoal(draft.goalBand.toFixed(1));
  }, []);

  React.useEffect(() => {
    const value = Number(goal);
    if (!Number.isNaN(value)) persistDraft({ goalBand: value });
  }, [goal]);

  const next = () => router.push('/onboarding/date');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepShell
        step={1}
        total={3}
        title="Your Target Band"
        subtitle="Pick the overall band you’re aiming for. You can adjust later."
        onNext={next}
        nextLabel="Continue"
        steps={STEPS}
        hint="Aim 0.5 higher than required — it helps counter exam-day variability."
      >
        <div className="grid gap-4">
          <Input
            type="number"
            step="0.5"
            min="4"
            max="9"
            label="Target Band"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {quickBands.map((q) => (
              <Button key={q} type="button" variant="ghost" className="rounded-ds-xl" onClick={() => setGoal(q)}>
                {q}
              </Button>
            ))}
          </div>
          <p className="text-small text-mutedText">
            Many universities accept 6.5–7.0. Choosing slightly higher keeps a healthy buffer.
          </p>
        </div>
      </StepShell>
    </div>
  );
}
