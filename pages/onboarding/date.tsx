// pages/onboarding/date.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import StepShell from '@/components/onboarding/StepShell';
import { Input } from '@/components/design-system/Input';
import { markStep, persistDraft, readDraft } from '@/lib/onboarding';

const STEPS = [
  { label: 'Target Band', href: '/onboarding/goal', done: true },
  { label: 'Exam Date', href: '/onboarding/date' },
  { label: 'WhatsApp Updates', href: '/onboarding/whatsapp' },
] as const;

export default function OnboardingDate() {
  const router = useRouter();
  const [examDate, setExamDate] = React.useState<string>('');

  React.useEffect(() => {
    markStep('date');
    const draft = readDraft();
    if (draft.examDate) setExamDate(draft.examDate);
  }, []);

  React.useEffect(() => {
    persistDraft({ examDate: examDate || null });
  }, [examDate]);

  const back = () => router.push('/onboarding/goal');
  const next = () => router.push('/onboarding/whatsapp');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepShell
        step={2}
        total={3}
        title="Your Exam Date"
        subtitle="We’ll back-calculate a plan that fits your deadline."
        onBack={back}
        onNext={next}
        nextLabel="Continue"
        steps={STEPS}
        hint="Not sure? Pick an approximate date — you can update any time."
      >
        <div className="grid gap-4">
          <Input
            type="date"
            label="IELTS Exam Date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
          <p className="text-small text-mutedText">
            Choosing a date helps us pace your mocks and AI-graded tasks.
          </p>
        </div>
      </StepShell>
    </div>
  );
}
