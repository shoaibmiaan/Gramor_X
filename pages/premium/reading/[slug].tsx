import * as React from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { ExamShell } from '@/premium-ui/exam/ExamShell';
import { PrButton } from '@/premium-ui/components/PrButton';
import { ResultPanel, type Criteria } from '@/premium-ui/results/ResultPanel';
import { ExamGate } from '@/premium-ui/access/ExamGate';
import { PinGate } from '@/premium-ui/access/PinGate';
import { useReadingExamState } from '@/premium-ui/exam/useReadingExamState';

type Question = {
  id: string;
  qNo: number;
  type: 'mcq' | 'tfng' | 'gap';
  prompt: string;
  options?: string[];
  answer?: string;
};

type Passage = {
  orderNo: number;
  title?: string;
  content: string;
  questions: Question[];
};

type ReadingTest = {
  slug: string;
  title: string;
  duration_sec: number;
  passages: Passage[];
};

type FlatQuestion = Question & { passageIndex: number };

const formatTimer = (seconds: number | null | undefined) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '00:00';
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
};

export default function ReadingExam() {
  const router = useRouter();
  const slug = String(router.query.slug || '');

  const [ready, setReady] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  const [test, setTest] = React.useState<ReadingTest | null>(null);
  const [review, setReview] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submittedAnswers, setSubmittedAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{
    band: number;
    criteria: Criteria;
    feedback: string;
  } | null>(null);

  const {
    attemptId,
    answers: storedAnswers,
    currentQuestion,
    passageIndex,
    secondsRemaining,
    setAnswer: setStoredAnswer,
    setCurrentQuestion,
    setPassageIndex,
    setSecondsRemaining,
    flush,
    clear,
  } = useReadingExamState({ slug });

  const answers = review ? submittedAnswers : storedAnswers;

  React.useEffect(() => {
    if (!ready || !slug) return;
    supabase
      .from('lm_reading_tests')
      .select('slug,title,passages,duration_sec')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setTest({
            slug: data.slug,
            title: data.title,
            duration_sec: data.duration_sec ?? 60 * 60,
            passages: (data.passages as Passage[]) || [],
          });
        }
      });
  }, [slug, ready]);

  React.useEffect(() => {
    if (!test) return;
    if (secondsRemaining == null) {
      setSecondsRemaining(test.duration_sec);
    }
  }, [test, secondsRemaining, setSecondsRemaining]);

  React.useEffect(() => {
    if (!test) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [test, setSecondsRemaining]);

  const flatQuestions = React.useMemo<FlatQuestion[]>(() => {
    if (!test) return [];
    return test.passages.flatMap((passage, passageIndex) =>
      passage.questions.map((q) => ({ ...q, passageIndex })),
    );
  }, [test]);

  const questionIndexMap = React.useMemo(() => {
    const map = new Map<number, number>();
    flatQuestions.forEach((q, index) => {
      map.set(q.qNo, index);
    });
    return map;
  }, [flatQuestions]);

  const answeredCount = React.useMemo(() => Object.keys(answers).length, [answers]);
  const totalQuestions = flatQuestions.length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const flatQuestionsById = React.useMemo(() => {
    const map = new Map<string, FlatQuestion>();
    flatQuestions.forEach((q) => map.set(q.id, q));
    return map;
  }, [flatQuestions]);

  const questionRefs = React.useRef<Record<string, HTMLElement | null>>({});

  const navigateToQuestion = React.useCallback(
    (qNo: number) => {
      const index = questionIndexMap.get(qNo);
      if (index == null) return;
      const target = flatQuestions[index];
      if (!target) return;
      setCurrentQuestion(qNo);
      setPassageIndex(target.passageIndex);
      requestAnimationFrame(() => {
        const ref = questionRefs.current[target.id];
        ref?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [flatQuestions, questionIndexMap, setCurrentQuestion, setPassageIndex],
  );

  const autoAdvance = React.useCallback(
    (current: number) => {
      const currentIdx = questionIndexMap.get(current);
      if (currentIdx == null) return;
      const next = flatQuestions[currentIdx + 1];
      if (!next) return;
      setCurrentQuestion(next.qNo);
      setPassageIndex(next.passageIndex);
      requestAnimationFrame(() => {
        const ref = questionRefs.current[next.id];
        ref?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [flatQuestions, questionIndexMap, setCurrentQuestion, setPassageIndex],
  );

  const goRelative = React.useCallback(
    (delta: number) => {
      if (!totalQuestions) return;
      const currentIdx = questionIndexMap.get(currentQuestion) ?? 0;
      const nextIdx = Math.min(Math.max(0, currentIdx + delta), totalQuestions - 1);
      const q = flatQuestions[nextIdx];
      if (!q) return;
      navigateToQuestion(q.qNo);
    },
    [currentQuestion, flatQuestions, navigateToQuestion, questionIndexMap, totalQuestions],
  );

  const saveAnswers = React.useCallback(
    async (payload: Record<string, string>) => {
      if (!test) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const rows = Object.entries(payload)
        .map(([qid, answer]) => {
          const q = flatQuestions.find((qq) => qq.id === qid);
          if (!q) return null;
          return {
            user_id: user?.id ?? null,
            test_slug: test.slug,
            q_no: q.qNo,
            answer,
          };
        })
        .filter(Boolean) as {
        user_id: string | null;
        test_slug: string;
        q_no: number;
        answer: string;
      }[];
      if (rows.length) {
        await supabase
          .from('lm_reading_user_answers')
          .upsert(rows, { onConflict: 'user_id,test_slug,q_no' });
      }
    },
    [test, flatQuestions],
  );

  const onSubmit = React.useCallback(
    async (auto = false) => {
      if (!test || submitting) return;
      setSubmitting(true);
      try {
        flush();
        const answersForSubmit = { ...storedAnswers };
        setSubmittedAnswers(answersForSubmit);
        setReview(true);
        await saveAnswers(answersForSubmit);

        const attempt =
          attemptId ||
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `attempt-${Date.now()}`);

        const text = Object.values(answersForSubmit).join('\n');
        await fetch(`/api/exam/${attempt}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        const response = await fetch(`/api/exam/${attempt}/score`);
        if (response.ok) {
          const json = await response.json();
          setResult({
            band: json.band ?? json.bandOverall,
            criteria: json.criteria,
            feedback: json.feedback,
          });
        }
      } catch (error) {
        if (!auto) {
          console.error(error);
        }
      } finally {
        clear();
        setSubmitting(false);
      }
    },
    [attemptId, clear, flush, saveAnswers, storedAnswers, submitting, test],
  );

  const handleAnswer = React.useCallback(
    (question: FlatQuestion, value: string, options?: { skipAuto?: boolean }) => {
      if (review) return;
      setStoredAnswer(question.id, value);
      setCurrentQuestion(question.qNo);
      if (!options?.skipAuto) {
        autoAdvance(question.qNo);
      }
    },
    [setStoredAnswer, autoAdvance, review, setCurrentQuestion],
  );

  const renderQuestionInput = React.useCallback(
    (question: FlatQuestion, value: string) => {
      if (question.type === 'mcq' && question.options) {
        return (
          <div className="pr-flex pr-flex-col pr-gap-2">
            {question.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswer(question, opt)}
                disabled={review || submitting}
                className={clsx(
                  'pr-flex pr-items-center pr-justify-between pr-rounded-lg pr-border pr-px-3 pr-py-2 pr-text-left pr-transition',
                  answers[question.id] === opt
                    ? 'pr-border-[var(--pr-primary,#4fb6ff)] pr-bg-[color-mix(in_srgb,var(--pr-primary,#4fb6ff) 12%,transparent)]'
                    : 'pr-border-[var(--pr-border,#1f2a48)] pr-bg-transparent hover:pr-border-[var(--pr-primary,#4fb6ff)]',
                )}
              >
                <span>{opt}</span>
                {answers[question.id] === opt && <span className="pr-text-sm pr-text-[var(--pr-primary,#4fb6ff)]">Selected</span>}
              </button>
            ))}
          </div>
        );
      }
      if (question.type === 'tfng') {
        const options = ['True', 'False', 'Not Given'];
        return (
          <div className="pr-flex pr-flex-wrap pr-gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswer(question, opt)}
                disabled={review || submitting}
                className={clsx(
                  'pr-rounded-full pr-border pr-px-4 pr-py-2 pr-text-sm pr-transition',
                  answers[question.id] === opt
                    ? 'pr-border-[var(--pr-primary,#4fb6ff)] pr-bg-[color-mix(in_srgb,var(--pr-primary,#4fb6ff) 12%,transparent)]'
                    : 'pr-border-[var(--pr-border,#1f2a48)] pr-bg-transparent hover:pr-border-[var(--pr-primary,#4fb6ff)]',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }
      return (
        <input
          value={answers[question.id] || ''}
          onChange={(event) => handleAnswer(question, event.target.value, { skipAuto: true })}
          disabled={review || submitting}
          className="pr-w-full pr-rounded-lg pr-border pr-border-[var(--pr-border,#1f2a48)] pr-bg-transparent pr-px-3 pr-py-2 focus:pr-border-[var(--pr-primary,#4fb6ff)] focus:pr-outline-none"
          placeholder="Type your answer"
        />
      );
    },
    [answers, handleAnswer, review, submitting],
  );

  React.useEffect(() => {
    if (review) return;
    if (typeof secondsRemaining === 'number' && secondsRemaining <= 0) {
      void onSubmit(true);
    }
  }, [secondsRemaining, review, onSubmit]);

  if (!ready) return <ExamGate onReady={() => setReady(true)} />;
  if (!unlocked) return <PinGate onSuccess={() => setUnlocked(true)} />;

  const timeDisplay = formatTimer(secondsRemaining);

  return (
    <ExamShell
      title={`Reading • ${slug}`}
      totalQuestions={totalQuestions}
      currentQuestion={currentQuestion}
      onNavigate={navigateToQuestion}
      seconds={secondsRemaining ?? undefined}
      onTimeUp={() => onSubmit(true)}
    >
      <div className="pr-relative pr-min-h-[100dvh] pr-bg-[var(--pr-app-bg,#040b1a)] pr-text-[var(--pr-foreground,#f8fafc)] pr-overflow-x-hidden">
        <header className="pr-sticky pr-top-[env(safe-area-inset-top,0px)] pr-z-30 pr-border-b pr-border-[var(--pr-border,#16213b)] pr-bg-[color-mix(in_srgb,var(--pr-app-bg,#040b1a) 95%,transparent)] pr-backdrop-blur pr-px-4 pr-py-3 sm:pr-px-6">
          <div className="pr-flex pr-flex-col pr-gap-3 sm:pr-flex-row sm:pr-items-center sm:pr-justify-between">
            <div>
              <h1 className="pr-text-lg pr-font-semibold">{test?.title || 'Reading Mock'}</h1>
              <p className="pr-text-sm pr-text-[var(--pr-muted,#94a3b8)]">
                Attempt ID: {attemptId ? attemptId.slice(0, 8) : '—'}
              </p>
            </div>
            <div className="pr-flex pr-flex-wrap pr-items-center pr-gap-3">
              <span className="pr-rounded-full pr-border pr-border-[var(--pr-primary,#4fb6ff)] pr-px-4 pr-py-1 pr-text-sm pr-font-medium pr-text-[var(--pr-primary,#4fb6ff)]">
                {timeDisplay}
              </span>
              <progress
                className="pr-h-2 pr-w-32 pr-rounded-full pr-bg-[var(--pr-border,#1f2a48)]"
                value={answeredCount}
                max={Math.max(totalQuestions, 1)}
              />
              <span className="pr-text-sm pr-text-[var(--pr-muted,#94a3b8)]">{progress}% answered</span>
            </div>
          </div>
        </header>

        <div className="pr-mx-auto pr-flex pr-w-full pr-max-w-6xl pr-flex-col pr-gap-6 pr-px-4 pr-pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pr-pt-6 sm:pr-px-6 lg:pr-flex-row">
          <main className="pr-flex-1 pr-space-y-4">
            <div className="pr-flex pr-flex-wrap pr-gap-2">
              {test?.passages.map((_, idx) => (
                <PrButton
                  key={idx}
                  variant={passageIndex === idx ? 'default' : 'outline'}
                  onClick={() => setPassageIndex(idx)}
                >
                  Passage {idx + 1}
                </PrButton>
              ))}
            </div>

            {test?.passages.map((passage, idx) => {
              const expanded = passageIndex === idx;
              return (
                <div
                  key={passage.orderNo}
                  className={clsx(
                    'pr-rounded-2xl pr-border pr-border-[var(--pr-border,#16213b)] pr-bg-[color-mix(in_srgb,var(--pr-card,#0b162d) 94%,transparent)] pr-transition-all',
                    expanded ? 'pr-shadow-[0_10px_40px_rgba(15,23,42,0.45)]' : 'pr-opacity-80 lg:pr-opacity-100',
                  )}
                >
                  <button
                    type="button"
                    className="pr-flex pr-w-full pr-items-center pr-justify-between pr-gap-3 pr-rounded-2xl pr-px-4 pr-py-3 pr-text-left pr-text-base pr-font-semibold"
                    onClick={() => setPassageIndex(idx)}
                  >
                    <span>
                      Passage {idx + 1}: {passage.title || 'Reading Section'}
                    </span>
                    <span className="pr-text-sm pr-text-[var(--pr-muted,#94a3b8)]">
                      {expanded ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  <div className={clsx('pr-grid pr-gap-4 pr-px-4 pr-pb-6', expanded ? 'pr-block' : 'pr-hidden lg:pr-block')}>
                    <article
                      className="pr-prose pr-prose-invert pr-max-w-none pr-bg-[color-mix(in_srgb,var(--pr-card,#0b162d) 50%,transparent)] pr-rounded-xl pr-border pr-border-[var(--pr-border,#16213b)] pr-px-4 pr-py-4"
                      dangerouslySetInnerHTML={{ __html: passage.content }}
                    />
                    <div className="pr-space-y-4">
                      {passage.questions.map((question) => {
                        const flat = flatQuestionsById.get(question.id);
                        if (!flat) return null;
                        return (
                          <div
                            key={question.id}
                            ref={(el) => {
                              questionRefs.current[question.id] = el;
                            }}
                            data-q={question.qNo}
                            className="pr-rounded-xl pr-border pr-border-[var(--pr-border,#16213b)] pr-bg-[color-mix(in_srgb,var(--pr-card,#0b162d) 70%,transparent)] pr-px-4 pr-py-4 pr-shadow-sm"
                          >
                            <div className="pr-mb-2 pr-flex pr-items-start pr-justify-between pr-gap-2">
                              <p className="pr-font-medium">
                                {question.qNo}. {question.prompt}
                              </p>
                              <span className="pr-text-xs pr-uppercase pr-text-[var(--pr-muted,#94a3b8)]">{question.type.toUpperCase()}</span>
                            </div>
                            {renderQuestionInput(flat, answers[question.id] || '')}
                            {review && question.answer && (
                              <p className="pr-mt-2 pr-text-sm pr-text-[var(--pr-success,#4ade80)]">Correct: {question.answer}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {review && result && <ResultPanel band={result.band} criteria={result.criteria} feedback={result.feedback} />}
          </main>

          <aside className="pr-hidden lg:pr-block lg:pr-w-72">
            <div className="pr-sticky pr-top-[calc(6.5rem+env(safe-area-inset-top,0px))] pr-space-y-4">
              <div className="pr-rounded-2xl pr-border pr-border-[var(--pr-border,#16213b)] pr-bg-[color-mix(in_srgb,var(--pr-card,#0b162d) 80%,transparent)] pr-px-4 pr-py-4">
                <h2 className="pr-mb-3 pr-text-sm pr-font-semibold pr-uppercase pr-tracking-wide pr-text-[var(--pr-muted,#94a3b8)]">
                  Question palette
                </h2>
                <div className="pr-grid pr-grid-cols-5 pr-gap-2">
                  {flatQuestions.map((q) => {
                    const isActive = currentQuestion === q.qNo;
                    const isAnswered = answers[q.id] != null && answers[q.id] !== '';
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => navigateToQuestion(q.qNo)}
                        className={clsx(
                          'pr-flex pr-h-9 pr-w-9 pr-items-center pr-justify-center pr-rounded-lg pr-border pr-text-sm',
                          isActive
                            ? 'pr-border-[var(--pr-primary,#4fb6ff)] pr-bg-[color-mix(in_srgb,var(--pr-primary,#4fb6ff) 18%,transparent)]'
                            : isAnswered
                            ? 'pr-border-[var(--pr-success,#4ade80)] pr-bg-[color-mix(in_srgb,var(--pr-success,#4ade80) 12%,transparent)]'
                            : 'pr-border-[var(--pr-border,#1f2a48)] pr-bg-transparent hover:pr-border-[var(--pr-primary,#4fb6ff)]',
                        )}
                      >
                        {q.qNo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="pr-fixed pr-bottom-0 pr-left-0 pr-right-0 pr-z-40 pr-border-t pr-border-[var(--pr-border,#16213b)] pr-bg-[color-mix(in_srgb,var(--pr-app-bg,#040b1a) 95%,transparent)] pr-backdrop-blur pr-px-4 pr-pt-4 pr-pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pr-hidden">
          <div className="pr-flex pr-items-center pr-gap-3">
            <PrButton variant="outline" className="pr-flex-1" onClick={() => goRelative(-1)} disabled={submitting || totalQuestions === 0}>
              Prev
            </PrButton>
            <PrButton variant="outline" className="pr-flex-1" onClick={() => goRelative(1)} disabled={submitting || totalQuestions === 0}>
              Next
            </PrButton>
            <PrButton className="pr-flex-1" onClick={() => onSubmit()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </PrButton>
          </div>
        </div>

        <div className="pr-hidden pr-border-t pr-border-[var(--pr-border,#16213b)] pr-bg-[color-mix(in_srgb,var(--pr-app-bg,#040b1a) 95%,transparent)] pr-px-6 pr-py-4 sm:pr-flex sm:pr-justify-end sm:pr-gap-3">
          <PrButton variant="outline" onClick={() => goRelative(-1)} disabled={submitting || totalQuestions === 0}>
            Previous
          </PrButton>
          <PrButton variant="outline" onClick={() => goRelative(1)} disabled={submitting || totalQuestions === 0}>
            Next
          </PrButton>
          <PrButton onClick={() => onSubmit()} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </PrButton>
        </div>
      </div>
    </ExamShell>
  );
}
