// pages/listening/[slug].tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { supabase } from '@/lib/supabaseClient';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Input } from '@/components/design-system/Input';
import FocusGuard from '@/components/exam/FocusGuard';
import { Timer } from '@/components/design-system/Timer';
import Icon from '@/components/design-system/Icon';

type MCQ = {
  id: string;
  qNo: number;
  type: 'mcq';
  prompt: string;
  options: string[];
  answer: string;
};

type GAP = {
  id: string;
  qNo: number;
  type: 'gap';
  prompt: string;
  answer: string;
};

type Question = MCQ | GAP;

type Section = {
  orderNo: number;
  startMs: number;
  endMs: number;
  audioUrl: string;
  transcript?: string;
  questions: Question[];
};

type ListeningTest = {
  id: string;
  slug: string;
  title: string;
  masterAudioUrl: string;
  sections: Section[];
};

type AnswersMap = Record<string, string>;

const TOTAL_TIME_SEC = 30 * 60; // 30 minutes

export default function ListeningTestPage() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  const [test, setTest] = useState<ListeningTest | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [checked, setChecked] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [pendingSeekMs, setPendingSeekMs] = useState<number | null>(null);

  const [answers, setAnswers] = useState<AnswersMap>({});

  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SEC);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [attemptFinished, setAttemptFinished] = useState(false);
  const submittedRef = useRef(false);

  // ---- Load test + sections + questions (NEW SCHEMA) ----
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setTestError(null);

      // 1) Test
      const { data: t, error: tErr } = await supabase
        .from('listening_tests')
        .select('id,slug,title,audio_url')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (cancelled) return;

      if (tErr || !t) {
        setTestError('Could not load this listening test. Please try another one.');
        return;
      }

      // 2) Sections by test_id
      const { data: sections, error: sErr } = await supabase
        .from('listening_sections')
        .select('order_no,start_ms,end_ms,audio_url,transcript')
        .eq('test_id', t.id)
        .order('order_no', { ascending: true });

      if (cancelled) return;
      if (sErr) {
        setTestError('Failed to load sections.');
        return;
      }

      // 3) Questions by test_id
      const { data: questions, error: qErr } = await supabase
        .from('listening_questions')
        .select(
          `
          id,
          question_number,
          question_type,
          question_text,
          prompt,
          options,
          correct_answer,
          section_no
        `,
        )
        .eq('test_id', t.id)
        .order('question_number', { ascending: true });

      if (cancelled) return;
      if (qErr) {
        setTestError('Failed to load questions.');
        return;
      }

      const secMap = new Map<number, Section>();
      (sections ?? []).forEach((s) => {
        secMap.set(s.order_no, {
          orderNo: s.order_no,
          startMs: s.start_ms ?? 0,
          endMs: s.end_ms ?? (s.start_ms ?? 0) + 60_000,
          audioUrl: s.audio_url,
          transcript: s.transcript ?? undefined,
          questions: [],
        });
      });

      (questions ?? []).forEach((q) => {
        const sec = secMap.get(q.section_no);
        if (!sec) return;

        const rawCorrect = q.correct_answer as unknown;
        let correct = '';

        if (typeof rawCorrect === 'string') {
          correct = rawCorrect;
        } else if (Array.isArray(rawCorrect)) {
          correct = rawCorrect[0] ?? '';
        } else if (rawCorrect && typeof rawCorrect === 'object') {
          // @ts-expect-error loose JSONB
          correct = (rawCorrect.value as string) ?? '';
        }

        const prompt =
          (q.prompt as string | null) ??
          (q.question_text as string | null) ??
          '';

        if (q.question_type === 'mcq') {
          sec.questions.push({
            id: q.id,
            qNo: q.question_number,
            type: 'mcq',
            prompt,
            options: ((q.options as unknown) ?? []) as string[],
            answer: correct,
          });
        } else {
          sec.questions.push({
            id: q.id,
            qNo: q.question_number,
            type: 'gap',
            prompt,
            answer: correct,
          });
        }
      });

      const orderedSections = [...secMap.values()]
        .sort((a, b) => a.orderNo - b.orderNo)
        .map((s) => ({
          ...s,
          questions: [...s.questions].sort((a, b) => a.qNo - b.qNo),
        }));

      const firstSectionAudio = orderedSections[0]?.audioUrl ?? '';
      const masterAudio =
        t.audio_url && t.audio_url.length > 0 ? t.audio_url : firstSectionAudio;

      setTest({
        id: t.id,
        slug: t.slug,
        title: t.title,
        masterAudioUrl: masterAudio,
        sections: orderedSections,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const currentSection = useMemo(
    () => (test ? test.sections[currentIdx] ?? test.sections[0] : null),
    [test, currentIdx],
  );

  const handleSetAnswer = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: value,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!test || !slug || submittedRef.current) return;
    submittedRef.current = true;
    setAttemptFinished(true);

    try {
      await fetch('/api/listening/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          test_slug: slug,
          answers: Object.entries(answers).map(([qid, answer]) => ({
            qid,
            answer,
          })),
          meta: {
            duration_sec: TOTAL_TIME_SEC - timeLeft,
          },
        }),
      });
    } catch {
      // swallow
    }

    router.push(`/listening/${slug}/review`);
  }, [answers, router, slug, test, timeLeft]);

  if (!slug) return null;

  // error UI
  if (testError) {
    return (
      <main className="py-10">
        <Container>
          <Card className="rounded-ds-2xl bg-amber-50 border border-amber-200 p-6">
            <h1 className="font-slab text-h3 text-amber-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-amber-800">{testError}</p>
            <div className="mt-4">
              <Button asChild size="sm" variant="primary" className="rounded-ds-xl">
                <Link href="/listening">Back to Listening tests</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </main>
    );
  }

  if (!test || !currentSection) {
    return (
      <main className="py-10">
        <Container>
          <Card className="p-6 rounded-ds-2xl">
            <div className="animate-pulse h-5 w-40 bg-muted rounded mb-2" />
            <div className="animate-pulse h-4 w-64 bg-muted rounded" />
            <div className="mt-4 space-y-2">
              <div className="animate-pulse h-4 w-full bg-muted rounded" />
              <div className="animate-pulse h-4 w-full bg-muted rounded" />
              <div className="animate-pulse h-4 w-3/4 bg-muted rounded" />
            </div>
          </Card>
        </Container>
      </main>
    );
  }

  const totalSections = test.sections.length;
  const isLastSection = currentIdx === totalSections - 1;

  // if section has its own audio_url, use that first; else fall back to master
  const audioSrc = currentSection.audioUrl || test.masterAudioUrl;

  return (
    <>
      <FocusGuard
        exam="listening"
        slug={slug}
        active={!attemptFinished}
        onFullscreenExit={() => setAttemptStarted(false)}
      />

      <main className="py-6">
        <Container className="space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-ds-full px-3 text-xs text-muted-foreground"
              >
                <Link href="/listening">
                  <Icon name="ArrowLeft" size={14} />
                  Exit Listening test
                </Link>
              </Button>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
                  IELTS Listening
                </p>
                <h1 className="font-slab text-h4">{test.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Timer
                initialSeconds={TOTAL_TIME_SEC}
                onTick={(secLeft) => {
                  setTimeLeft(secLeft);
                  if (!attemptStarted && secLeft < TOTAL_TIME_SEC) {
                    setAttemptStarted(true);
                  }
                }}
                onComplete={handleSubmit}
              />
              <Badge variant="neutral" size="sm">
                Section {currentSection.orderNo} of {totalSections}
              </Badge>
            </div>
          </div>

          {/* Audio + transcript */}
          <Card className="p-4 rounded-ds-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="Headphones" size={16} className="text-primary" />
                <p className="text-xs font-medium text-muted-foreground">
                  Audio (single play per section · IELTS-style)
                </p>
              </div>
            </div>

            <audio
              controls
              src={audioSrc}
              onTimeUpdate={(e) => {
                const audio = e.currentTarget;
                const ms = audio.currentTime * 1000;
                if (ms > currentSection.endMs && autoPlay) {
                  audio.pause();
                }
              }}
              onLoadedMetadata={(e) => {
                if (pendingSeekMs != null) {
                  e.currentTarget.currentTime = pendingSeekMs / 1000;
                  setPendingSeekMs(null);
                } else {
                  e.currentTarget.currentTime = currentSection.startMs / 1000;
                }
              }}
            />

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="secondary"
                  className="rounded-ds-full"
                  onClick={() => {
                    setPendingSeekMs(currentSection.startMs);
                  }}
                >
                  <Icon name="RotateCcw" size={14} />
                  Restart section audio
                </Button>

                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Auto-pause at end of section</span>
                </label>
              </div>

              <Button
                size="xs"
                variant="ghost"
                className="rounded-ds-full"
                onClick={() => setTranscriptOpen((v) => !v)}
              >
                <Icon name="FileText" size={14} />
                {transcriptOpen ? 'Hide transcript' : 'Show transcript'}
              </Button>
            </div>

            {transcriptOpen && currentSection.transcript && (
              <div className="mt-2 rounded-ds-xl bg-muted px-3 py-2 text-xs text-muted-foreground max-h-56 overflow-y-auto">
                {currentSection.transcript.split('\n').map((line, idx) => (
                  <p key={idx} className="mb-1">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </Card>

          {/* Questions */}
          <Card className="p-5 rounded-ds-2xl space-y-4">
            {currentSection.questions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No questions found for this section. Check your seeding for{' '}
                <code className="font-mono text-[11px]">
                  listening_questions.test_id = {test.id}
                </code>
                .
              </p>
            )}

            {currentSection.questions.map((q) => {
              const userAnswer = answers[q.id] ?? '';
              const isMCQ = q.type === 'mcq';

              const isCorrect =
                userAnswer &&
                userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();

              return (
                <div
                  key={q.id}
                  className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground">
                      Q{q.qNo}. {q.prompt}
                    </p>
                    {checked && (
                      <Badge
                        size="xs"
                        variant={isCorrect ? 'success' : 'danger'}
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    )}
                  </div>

                  {isMCQ ? (
                    <div className="grid gap-2">
                      {(q as MCQ).options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSetAnswer(q.id, opt)}
                          className={`w-full text-left text-xs rounded-ds-xl border px-3 py-2 transition ${
                            userAnswer === opt
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-card hover:border-primary/60'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={userAnswer}
                        onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                        placeholder="Write your answer"
                      />
                      {checked && (
                        <p className="text-[11px] text-muted-foreground">
                          Correct answer:{' '}
                          <span className="font-semibold text-foreground">
                            {q.answer}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Bottom controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-ds-full"
                disabled={currentIdx === 0}
                onClick={() =>
                  setCurrentIdx((prev) => Math.max(0, prev - 1))
                }
              >
                <Icon name="ArrowLeft" size={14} />
                Previous section
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-ds-full"
                disabled={isLastSection}
                onClick={() =>
                  setCurrentIdx((prev) => prev + 1)
                }
              >
                Next section
                <Icon name="ArrowRight" size={14} />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-ds-full text-xs"
                onClick={() => setChecked((v) => !v)}
              >
                {checked ? 'Hide check' : 'Quick check (local only)'}
              </Button>

              <Button
                size="sm"
                variant="primary"
                className="rounded-ds-full text-xs"
                onClick={handleSubmit}
                disabled={attemptFinished}
              >
                Submit and view band
              </Button>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
