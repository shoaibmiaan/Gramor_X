// pages/onboarding/index.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import StepShell from '@/components/onboarding/StepShell';
import { Card } from '@/components/design-system/Card';
import { getMarkedStep, readDraft, type OnboardingStep } from '@/lib/onboarding';

const BASE_STEPS = [
  { label: 'Target Band', href: '/onboarding/goal' },
  { label: 'Exam Date', href: '/onboarding/date' },
  { label: 'WhatsApp Updates', href: '/onboarding/whatsapp' },
];

export default function Onboarding() {
  const router = useRouter();
  const [resumeStep, setResumeStep] = React.useState<OnboardingStep>('band');
  const [steps, setSteps] = React.useState(BASE_STEPS);

  React.useEffect(() => {
    const draft = readDraft();
    const marked = getMarkedStep();

    const goalSet = !!draft.goalBand;
    const dateSet = !!draft.examDate;

    setSteps([
      { ...BASE_STEPS[0], done: goalSet },
      { ...BASE_STEPS[1], done: goalSet && dateSet },
      { ...BASE_STEPS[2], done: false },
    ]);

    if (marked) {
      setResumeStep(marked);
      return;
    }
    if (!goalSet) {
      setResumeStep('band');
    } else if (!dateSet) {
      setResumeStep('date');
    } else {
      setResumeStep('whatsapp');
    }
  }, []);

  const nextHref = resumeStep === 'date' ? '/onboarding/date' : resumeStep === 'whatsapp' ? '/onboarding/whatsapp' : '/onboarding/goal';
  const stepIndex = resumeStep === 'date' ? 2 : resumeStep === 'whatsapp' ? 3 : 1;
  const next = () => router.push(nextHref);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepShell
        step={stepIndex}
        total={3}
        title="Let’s set up your IELTS plan"
        subtitle="Three quick steps — band, exam date, and reminder preferences — then you’re ready to practice."
        onNext={next}
        nextLabel="Start"
        steps={steps}
        hint="Pro tip: Keep a 0.5 band buffer above your target for safety."
      >
        <div className="grid gap-3">
          {steps.map((s, i) => (
            <Card key={s.label} className="p-3 rounded-ds-xl border border-border">
              <div className="text-small">Step {i + 1}</div>
              <div className="font-medium">{s.label}</div>
            </Card>
          ))}
          <p className="text-small text-mutedText">You can update all of these later from your dashboard.</p>
        </div>
      </StepShell>
    </div>
  );
}
