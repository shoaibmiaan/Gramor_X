import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import SectionTest, { SectionTestHandle } from '@/components/mock-tests/SectionTest';
import { mockSections } from '@/data/mock';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import ExamLayout from '@/components/layouts/ExamLayout';

function formatMinutes(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export default function SectionPage() {
  const router = useRouter();
  const { section, mode: modeQuery } = router.query as { section?: string; mode?: string };
  const mode = modeQuery === 'practice' ? 'practice' : 'simulation';
  const sectionKey = typeof section === 'string' ? section : undefined;
  const sectionData = sectionKey ? mockSections[sectionKey] : undefined;
  const testRef = useRef<SectionTestHandle>(null);

  const [completed, setCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(mode === 'practice');
  const [timeLeft, setTimeLeft] = useState(sectionData?.duration ?? 0);
  const [answerSheet, setAnswerSheet] = useState<number[]>(() =>
    sectionData ? Array(sectionData.questions.length).fill(-1) : []
  );
  const [resumeAvailable, setResumeAvailable] = useState(false);

  useEffect(() => {
    setCompleted(false);
    setHasStarted(mode === 'practice');
  }, [sectionKey, mode]);

  useEffect(() => {
    if (!sectionData) {
      setAnswerSheet([]);
      setTimeLeft(0);
      return;
    }
    setAnswerSheet(Array(sectionData.questions.length).fill(-1));
    setTimeLeft(sectionData.duration);
  }, [sectionData, mode]);

  useEffect(() => {
    if (mode !== 'simulation' || !sectionKey) {
      setResumeAvailable(false);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(`mock-${sectionKey}-state`);
      if (!saved) {
        setResumeAvailable(false);
        return;
      }
      const parsed = JSON.parse(saved) as { answers?: number[] } | null;
      if (parsed && Array.isArray(parsed.answers) && parsed.answers.some((value) => value !== -1)) {
        setResumeAvailable(true);
      } else {
        setResumeAvailable(false);
      }
    } catch {
      setResumeAvailable(false);
    }
  }, [sectionKey, mode]);

  useEffect(() => {
    if (!hasStarted || completed) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasStarted, completed]);

  useEffect(() => {
    if (!hasStarted || completed || mode !== 'simulation') return;
    if (timeLeft === 0) {
      testRef.current?.submit();
    }
  }, [timeLeft, hasStarted, completed, mode]);

  if (!sectionKey || !sectionData) {
    return (
      <section className="py-24">
        <Container>
          <Card className="rounded-ds-2xl p-6">
            <p>Section not found.</p>
          </Card>
        </Container>
      </section>
    );
  }

  const { duration, questions } = sectionData;
  const sectionLabel = `${sectionKey.charAt(0).toUpperCase()}${sectionKey.slice(1)}`;
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timeLeft]);

  const partNavigator = (
    <nav aria-label="Module navigation" className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
      {Object.keys(mockSections).map((key) => {
        const label = `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        const href = `/mock/${key}?mode=${mode}`;
        const active = key === sectionKey;
        return (
          <Link
            key={key}
            href={href}
            className={`rounded-full border px-3 py-1 transition ${
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/60 hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const questionPalette = (
    <nav aria-label="Question navigator" className="space-y-3">
      <div className="text-small font-semibold text-muted-foreground">Questions</div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, index) => {
          const answered = answerSheet[index] !== -1;
          return (
            <a
              key={q.id}
              href={`#question-${index + 1}`}
              className={`flex h-10 items-center justify-center rounded-full border text-small font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                answered
                  ? 'border-primary bg-primary text-background hover:opacity-90'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:text-foreground'
              }`}
            >
              <span aria-hidden="true">{index + 1}</span>
              <span className="sr-only">
                {answered ? `Question ${index + 1} answered` : `Question ${index + 1} not answered`}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );

  if (!hasStarted && mode === 'simulation') {
    return (
      <section className="py-24">
        <Container className="max-w-3xl">
          <Card className="space-y-6 rounded-ds-2xl border border-border/60 bg-card/60 p-8">
            <div className="space-y-2">
              <h1 className="text-h3 font-semibold text-foreground">{sectionLabel} Simulation</h1>
              <p className="text-muted-foreground">
                Enter distraction-free mode when you begin. You&apos;ll have {formatMinutes(duration)} to finish
                {` ${questions.length}`} questions.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-ds-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary">
                {resumeAvailable ? (
                  <>
                    <p className="font-semibold">Resume saved attempt</p>
                    <p className="mt-1 text-primary/80">Continue where you left off — your answers are still here.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Stay focused</p>
                    <p className="mt-1 text-primary/80">
                      Fullscreen activates at the start and exits automatically when you submit.
                    </p>
                  </>
                )}
              </Card>
              <Card className="rounded-ds-xl border border-dashed border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Timer preview</p>
                <p className="mt-1">
                  {formatMinutes(duration)} · {questions.length} questions · timer counts down from {formattedTime}
                </p>
              </Card>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                className="rounded-ds"
                onClick={() => {
                  setHasStarted(true);
                  setResumeAvailable(false);
                  setTimeLeft(duration);
                }}
              >
                {resumeAvailable ? 'Resume and enter fullscreen' : 'Begin simulation'}
              </Button>
              <Button variant="secondary" className="rounded-ds" href={`/mock/${sectionKey}?mode=practice`}>
                Switch to practice mode
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  const timerDisplay = (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Time remaining"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-small"
    >
      <span aria-hidden="true" role="img">
        ⏱️
      </span>
      <span aria-hidden="true">{formattedTime}</span>
      <span className="sr-only">Time remaining {formattedTime}</span>
    </div>
  );

  return (
    <ExamLayout
      exam="mock-test"
      slug={sectionKey}
      title={`${mode === 'simulation' ? 'Simulation' : 'Practice'} · ${sectionLabel}`}
      seconds={duration}
      onElapsed={mode === 'simulation' ? () => testRef.current?.submit() : undefined}
      timer={timerDisplay}
      partNavigator={partNavigator}
      questionPalette={questionPalette}
      focusMode={{ active: mode === 'simulation' && hasStarted && !completed }}
    >
      <div className="space-y-4">
        <Card className="rounded-ds-2xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
          {mode === 'simulation' ? (
            <p>
              Treat this as the real thing — the timer will auto-submit, fullscreen locks in once you start, and focus guard
              tracks tab switches.
            </p>
          ) : (
            <p>
              Practice mode provides instant feedback under each question so you can learn as you go. Use the timer as a
              pacing guide.
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
            setHasStarted(false);
          }}
          onAnswerChange={setAnswerSheet}
        />
      </div>
    </ExamLayout>
  );
}
