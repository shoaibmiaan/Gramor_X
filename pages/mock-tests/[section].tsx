import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import SectionTest, { SectionTestHandle } from '@/components/mock-tests/SectionTest';
import { mockSections } from '@/data/mockTests';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import ExamLayout from '@/components/layouts/ExamLayout';

export default function SectionPage() {
  const router = useRouter();
  const { section, mode: modeQuery } = router.query as { section?: string; mode?: string };
  const mode = modeQuery === 'practice' ? 'practice' : 'simulation';
  const sectionKey = typeof section === 'string' ? section : undefined;
  const testRef = useRef<SectionTestHandle>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(false);
  }, [sectionKey, mode]);
  if (!sectionKey || !mockSections[sectionKey]) {
    return (
      <section className="py-24">
        <Container>
          <Card className="p-6 rounded-ds-2xl">
            <p>Section not found.</p>
          </Card>
        </Container>
      </section>
    );
  }
  const { duration, questions } = mockSections[sectionKey];
  const sectionLabel = `${sectionKey.charAt(0).toUpperCase()}${sectionKey.slice(1)}`;
  return (
    <ExamLayout
      exam="mock-test"
      slug={sectionKey}
      title={`${mode === 'simulation' ? 'Simulation' : 'Practice'} · ${sectionLabel}`}
      seconds={duration}
      onElapsed={mode === 'simulation' ? () => testRef.current?.submit() : undefined}
      focusMode={{ active: mode === 'simulation' && !completed }}
    >
      <div className="space-y-4">
        <Card className="rounded-ds-2xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
          {mode === 'simulation' ? (
            <p>
              Treat this as the real thing — the timer will auto-submit, and focus guard tracks tab
              switches.
            </p>
          ) : (
            <p>
              Practice mode provides instant feedback under each question so you can learn as you
              go. Use the timer as a pacing guide.
            </p>
          )}
        </Card>
        <SectionTest
          ref={testRef}
          section={sectionKey}
          questions={questions}
          mode={mode}
          onComplete={() => {
            setCompleted(true);
          }}
        />
      </div>
    </ExamLayout>
  );
}
