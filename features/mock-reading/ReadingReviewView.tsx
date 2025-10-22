import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

type QType = 'tfng' | 'yynn' | 'heading' | 'match' | 'mcq' | 'gap';
type Q = { id: string; type: QType; prompt?: string; options?: string[]; answer: string; explanation?: string };
type Passage = { id: string; title: string; text: string; questions: Q[] };
type ReadingPaper = { id: string; title: string; passages: Passage[] };

type Attempt = { id: string; answers: Record<string, string>; score: number; total: number; percentage: number; submitted_at: string };
type AttemptRecord = Attempt & { paper_id?: string | null };

const sampleReading: ReadingPaper = {
  id: 'sample-001',
  title: 'Reading Sample 001',
  passages: [
    {
      id: 'P1',
      title: 'The Honeybee',
      text: 'Bees are fascinating…',
      questions: [
        {
          id: 'q1',
          type: 'tfng',
          prompt: 'Bees can see UV light.',
          answer: 'True',
          explanation: 'Bees have UV vision.'
        },
        {
          id: 'q2',
          type: 'yynn',
          prompt: 'Honey is spicy.',
          answer: 'No',
          explanation: 'Honey is sweet.'
        },
        {
          id: 'q3',
          type: 'heading',
          prompt: 'Choose paragraph heading',
          options: ['Origins', 'Vision', 'Diet'],
          answer: 'Vision',
          explanation: 'The paragraph describes visual capability.'
        }
      ]
    },
    {
      id: 'P2',
      title: 'Ancient Roads',
      text: 'Roads enabled trade…',
      questions: [
        {
          id: 'q4',
          type: 'match',
          prompt: 'Match A with B',
          options: ['Roman', 'Silk', 'Inca'],
          answer: 'Roman',
          explanation: 'Describes Roman roads.'
        },
        {
          id: 'q5',
          type: 'mcq',
          prompt: 'Pick one',
          options: ['A', 'B', 'C'],
          answer: 'C',
          explanation: 'Option C aligns with text.'
        }
      ]
    }
  ]
};

const loadPaper = async (id: string): Promise<ReadingPaper> => {
  try {
    const mod = await import(`@/data/reading/${id}.json`);
    return mod.default as ReadingPaper;
  } catch {
    return sampleReading;
  }
};

const Shell: React.FC<{
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  mainClassName?: string;
}> = ({ title, right, children, mainClassName }) => (
  <div className="min-h-screen bg-background text-foreground">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
    >
      Skip to main content
    </a>
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4" role="banner">
        <h1 className="text-h3 font-semibold" id="review-page-heading">
          {title}
        </h1>
        {right ? (
          <div aria-live="polite" className="flex items-center gap-3">
            {right}
          </div>
        ) : null}
      </header>
      <main id="main-content" aria-labelledby="review-page-heading" className={mainClassName || 'grid gap-6'}>
        {children}
      </main>
    </div>
  </div>
);

const ReadingReviewView: React.FC = () => {
  const router = useRouter();
  const { id: routePaperId, paperId: queryPaperId, attempt, attemptId } = router.query as {
    id?: string | string[];
    paperId?: string | string[];
    attempt?: string | string[];
    attemptId?: string | string[];
  };
  const resolvedAttemptId =
    typeof attemptId === 'string'
      ? attemptId
      : typeof attempt === 'string'
        ? attempt
        : undefined;
  const routerReady = router.isReady;

  const [paperId, setPaperId] = useState<string | null>(null);
  const [paper, setPaper] = useState<ReadingPaper | null>(null);
  const [att, setAtt] = useState<Attempt | null>(null);
  const [attemptState, setAttemptState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (typeof routePaperId === 'string') {
      setPaperId(routePaperId);
    } else if (Array.isArray(routePaperId) && routePaperId[0]) {
      setPaperId(routePaperId[0]);
    }
  }, [routePaperId]);

  useEffect(() => {
    if (typeof queryPaperId === 'string') {
      setPaperId(queryPaperId);
    } else if (Array.isArray(queryPaperId) && queryPaperId[0]) {
      setPaperId(queryPaperId[0]);
    }
  }, [queryPaperId]);

  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadPaper(paperId);
      if (!cancelled) {
        setPaper(loaded);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paperId]);

  useEffect(() => {
    if (!routerReady) return;
    if (!resolvedAttemptId) {
      if (attemptState === 'idle') {
        setAttemptState('error');
      }
      return;
    }

    let cancelled = false;
    const fetchAttempt = async () => {
      setAttemptState('loading');
      try {
        const { data } = await supabase
          .from('attempts_reading')
          .select('*')
          .eq('id', resolvedAttemptId)
          .single();
        if (!cancelled && data) {
          const record = data as AttemptRecord & { paper_id?: string | null };
          setAtt({
            id: String(record.id ?? resolvedAttemptId),
            answers: record.answers || {},
            score: record.score ?? 0,
            total: record.total ?? 0,
            percentage: record.percentage ?? 0,
            submitted_at: record.submitted_at ?? new Date().toISOString()
          });
          const paperIdFromRecord = record.paper_id ?? undefined;
          if (paperIdFromRecord) {
            setPaperId((prev) => (prev === paperIdFromRecord ? prev : paperIdFromRecord));
          }
          setAttemptState('ready');
          return;
        }
      } catch {
        // ignore supabase errors and fall back to local storage
      }

      if (cancelled) return;

      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(`read:attempt-res:${resolvedAttemptId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            const answers = parsed.answers || {};
            const passages = (parsed.paper?.passages ?? []) as Passage[];
            const flat: Q[] = passages.flatMap((p) => p.questions || []);
            const total = flat.length;
            let score = 0;
            for (const q of flat) {
              if ((answers[q.id] ?? '').trim().toLowerCase() === (q.answer ?? '').trim().toLowerCase()) score++;
            }
            setAtt({
              id: resolvedAttemptId,
              answers,
              score,
              total,
              percentage: total ? Math.round((score / total) * 100) : 0,
              submitted_at: parsed.submitted_at ?? new Date().toISOString()
            });
            if (parsed.paper?.id) {
              setPaperId((prev) => prev ?? parsed.paper.id);
            }
            setAttemptState('ready');
            return;
          }
        } catch {
          // local storage unavailable
        }
      }

      if (!cancelled) {
        setAttemptState('error');
      }
    };

    void fetchAttempt();

    return () => {
      cancelled = true;
    };
  }, [routerReady, resolvedAttemptId, attemptState]);

  useEffect(() => {
    if (attemptState === 'error') {
      setPaperId((prev) => prev ?? 'sample-001');
    }
  }, [attemptState]);

  useEffect(() => {
    if (attemptState !== 'error' || att || !paper) return;
    const flat = paper.passages.flatMap((p) => p.questions || []);
    setAtt({
      id: resolvedAttemptId ?? 'demo-attempt',
      answers: {},
      score: 0,
      total: flat.length,
      percentage: 0,
      submitted_at: new Date().toISOString()
    });
    setAttemptState('ready');
  }, [attemptState, att, paper, resolvedAttemptId]);

  useEffect(() => {
    if (!paperId) return;
    void router.prefetch('/mock/reading/[id]', `/mock/reading/${paperId}`);
  }, [paperId, router]);

  const flatQs = useMemo(() => paper?.passages.flatMap((p) => p.questions) ?? [], [paper]);

  const statsByType = useMemo(() => {
    if (!paper || !att) return [] as { type: string; correct: number; total: number; pct: number }[];
    const map: Record<string, { correct: number; total: number }> = {};
    for (const q of flatQs) {
      const key = q.type;
      map[key] ??= { correct: 0, total: 0 };
      map[key].total++;
      const ok = (att.answers?.[q.id] ?? '').trim().toLowerCase() === (q.answer ?? '').trim().toLowerCase();
      if (ok) map[key].correct++;
    }
    return Object.entries(map).map(([type, { correct, total }]) => ({
      type,
      correct,
      total,
      pct: total ? Math.round((correct / total) * 100) : 0
    }));
  }, [paper, att, flatQs]);

  if (!paper || !att) {
    return (
      <Shell title="Review — Loading…" mainClassName="grid gap-6">
        <div className="rounded-2xl border border-border p-4" role="status" aria-live="polite">
          Loading…
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={`Review — ${paper.title}`}
      right={
        <div className="rounded-full border border-border px-3 py-1 text-small" role="status" aria-live="polite">
          Score: {att.score}/{att.total} ({att.percentage}%)
        </div>
      }
      mainClassName="grid gap-6"
    >
      <section className="rounded-2xl border border-border p-4" aria-labelledby="performance-heading">
        <h2 id="performance-heading" className="mb-2 text-body font-semibold">
          Performance by question type
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3" role="list">
          {statsByType.length > 0 ? (
            statsByType.map((s) => (
              <article
                key={s.type}
                role="listitem"
                className="rounded-lg border border-border p-3 text-small"
                aria-label={`${labelType(s.type)}: ${s.correct} of ${s.total} correct (${s.pct} percent)`}
              >
                <div className="font-medium">{labelType(s.type)}</div>
                <div className="text-foreground/80">{s.correct}/{s.total} correct • {s.pct}%</div>
              </article>
            ))
          ) : (
            <p className="text-small text-foreground/80">No responses recorded.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border p-4" aria-labelledby="answers-heading">
        <h2 id="answers-heading" className="mb-2 text-body font-semibold">
          Answers &amp; explanations
        </h2>
        <div className="grid gap-3">
          {flatQs.map((q, idx) => {
            const promptId = `review-question-${q.id}`;
            const explanationId = q.explanation ? `review-question-${q.id}-explanation` : undefined;
            const given = (att.answers?.[q.id] ?? '').trim();
            const ok = given.toLowerCase() === (q.answer ?? '').trim().toLowerCase();
            return (
              <article
                key={q.id}
                className="rounded-lg border border-border p-3"
                aria-labelledby={promptId}
                aria-describedby={explanationId}
              >
                <h3 id={promptId} className="mb-1 text-small font-medium text-foreground/80">
                  Q{idx + 1}. {q.prompt || q.id}
                </h3>
                <dl className="space-y-1 text-small">
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="sr-only">Result</dt>
                    <dd>
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-background ${ok ? 'bg-primary' : 'bg-border text-foreground'}`}
                        aria-label={ok ? 'Answer correct' : 'Answer incorrect'}
                      >
                        {ok ? 'Correct' : 'Wrong'}
                      </span>
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-medium">Your answer:</dt>
                    <dd>
                      <strong>{given || '—'}</strong>
                    </dd>
                  </div>
                  {!ok && (
                    <div className="flex flex-wrap gap-2">
                      <dt className="font-medium">Correct answer:</dt>
                      <dd>
                        <strong>{q.answer}</strong>
                      </dd>
                    </div>
                  )}
                </dl>
                {q.explanation && (
                  <p id={explanationId} className="mt-2 text-small text-foreground/80">
                    {q.explanation}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/reading" prefetch className="text-small underline underline-offset-4">
          Try another reading
        </Link>
        <Link
          href="/dashboard"
          prefetch
          className="rounded-xl border border-border px-4 py-2 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Go to dashboard
        </Link>
      </div>
    </Shell>
  );
};

const labelType = (t: string) =>
  t === 'tfng'
    ? 'True/False/Not Given'
    : t === 'yynn'
      ? 'Yes/No/Not Given'
      : t === 'heading'
        ? 'Headings'
        : t === 'match'
          ? 'Matching'
          : t === 'mcq'
            ? 'Multiple Choice'
            : 'Gap Fill';

export default ReadingReviewView;
