// pages/mock/reading/challenges/speed.tsx
import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { getServerClient } from '@/lib/supabaseServer';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type SpeedQuestion = {
  id: string;
  prompt: string;
  instruction: string | null;
  // assuming options is an array of strings; if null, we’ll show a text input
  options: string[] | null;
  correctAnswer: string | null;
};

type PageProps = {
  testTitle: string | null;
  testSlug: string | null;
  questions: SpeedQuestion[];
  error?: string;
};

const DURATION_SECONDS = 180; // 3 minutes

const SpeedChallengePage: NextPage<PageProps> = ({
  testTitle,
  testSlug,
  questions,
  error,
}) => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = React.useState(DURATION_SECONDS);
  const [started, setStarted] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [score, setScore] = React.useState<{
    correct: number;
    total: number;
    attempted: number;
  } | null>(null);

  // Timer
  React.useEffect(() => {
    if (!started || finished) return;
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, timeLeft]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleStart = () => {
    if (!questions.length) return;
    setStarted(true);
  };

  const handleFinish = () => {
    if (finished) return;

    const total = questions.length;
    let correct = 0;
    let attempted = 0;

    for (const q of questions) {
      const userAns = answers[q.id];
      if (userAns && userAns.trim() !== '') {
        attempted += 1;
      }
      if (
        q.correctAnswer != null &&
        userAns != null &&
        String(userAns).trim().toLowerCase() ===
          String(q.correctAnswer).trim().toLowerCase()
      ) {
        correct += 1;
      }
    }

    setScore({ correct, total, attempted });
    setFinished(true);
    setStarted(false);
  };

  if (error) {
    return (
      <>
        <Head>
          <title>Speed Challenge · Reading · GramorX</title>
        </Head>
        <section className="py-10 bg-background">
          <Container className="max-w-3xl space-y-6">
            <Card className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Icon name="alert-triangle" className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Unable to load Speed Challenge</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button asChild>
                  <Link href="/mock/reading">
                    <Icon name="arrow-left" className="h-4 w-4 mr-2" />
                    Back to Reading
                  </Link>
                </Button>
              </div>
            </Card>
          </Container>
        </section>
      </>
    );
  }

  const showQuestions = started || finished;

  return (
    <>
      <Head>
        <title>Speed Challenge · Reading Mocks · GramorX</title>
      </Head>
      <Container className="py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href="/mock/reading">
                  <Icon name="arrow-left" className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">
                3-Minute Speed Challenge
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Answer as many questions as you can in 3 minutes. Fast, focused Reading practice.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Card className="px-4 py-2 flex items-center gap-2">
              <Icon
                name={started && !finished ? 'timer' : 'clock'}
                className="h-4 w-4 text-primary"
              />
              <span className="font-mono text-sm font-semibold">
                {formatTime(timeLeft)}
              </span>
            </Card>
          </div>
        </div>

        {/* Info / Summary Card */}
        <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge size="xs" variant="outline">
              Speed Mode
            </Badge>
            <h2 className="text-sm font-semibold">
              {testTitle || 'Reading question pool'}
            </h2>
            <p className="text-xs text-muted-foreground max-w-md">
              You&apos;ll see up to {questions.length} questions from our Reading pool. Focus on
              accuracy under time pressure. Your score is calculated instantly.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="zap" className="h-3 w-3" />
              3 minutes total
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="target" className="h-3 w-3" />
              Try to hit 80%+
            </span>
          </div>
        </Card>

        {/* Results */}
        {finished && score && (
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-primary/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Icon name="trophy" className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold">Your Speed Challenge Result</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                You answered {score.attempted} out of {score.total} questions and got{' '}
                <span className="font-semibold">{score.correct}</span> correct.
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {score.total > 0
                    ? Math.round((score.correct / score.total) * 100)
                    : 0}
                  %
                </div>
                <div className="text-muted-foreground">Accuracy</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // quick restart: hard reload page
                  router.replace(router.asPath);
                }}
              >
                <Icon name="rotate-ccw" className="h-4 w-4 mr-1" />
                Try Another Round
              </Button>
            </div>
          </Card>
        )}

        {/* Questions List */}
        {showQuestions ? (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Questions ({questions.length})
              </span>
              {!finished && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFinish}
                  disabled={finished}
                >
                  <Icon name="flag" className="h-4 w-4 mr-1" />
                  Finish Now
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="rounded-ds border p-3 space-y-2 bg-card/40"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {index + 1}.
                    </span>
                    <div className="space-y-1">
                      {q.instruction && (
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {q.instruction}
                        </p>
                      )}
                      <p className="text-sm">{q.prompt}</p>
                    </div>
                  </div>

                  {/* Options / Answer Input */}
                  {q.options && q.options.length > 0 ? (
                    <div className="space-y-1 pl-5">
                      {q.options.map((opt, optIndex) => {
                        const value = String.fromCharCode(65 + optIndex); // A, B, C...
                        const selected = answers[q.id] === value;
                        return (
                          <button
                            key={optIndex}
                            type="button"
                            onClick={() => {
                              if (finished) return;
                              handleAnswerChange(q.id, value);
                            }}
                            className={[
                              'w-full text-left text-xs px-3 py-2 rounded-ds border transition',
                              selected
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-background hover:bg-muted',
                            ].join(' ')}
                          >
                            <span className="font-mono mr-2 text-[11px]">
                              {value}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pl-5">
                      <input
                        type="text"
                        className="w-full text-sm rounded-ds border bg-background px-3 py-2"
                        placeholder="Type your answer..."
                        value={answers[q.id] ?? ''}
                        onChange={(e) =>
                          !finished &&
                          handleAnswerChange(q.id, e.target.value || '')
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Ready to go fast?</h3>
              <p className="text-xs text-muted-foreground">
                You&apos;ll get a short burst of Reading questions. Once you hit start, the 3-minute timer begins.
              </p>
            </div>
            <Button size="lg" onClick={handleStart} disabled={!questions.length}>
              <Icon name="play-circle" className="h-5 w-5 mr-2" />
              Start Speed Challenge
            </Button>
          </Card>
        )}
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  try {
    const supabase = getServerClient(ctx.req, ctx.res);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        redirect: {
          destination:
            '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl ?? '/mock/reading/challenges/speed'),
          permanent: false,
        },
      };
    }

    // Get one active Reading test to use as the pool source
    const { data: testRow, error: testError } = await supabase
      .from('reading_tests')
      .select('id, slug, title')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (testError || !testRow) {
      return {
        props: {
          testTitle: null,
          testSlug: null,
          questions: [],
          error: 'No active Reading tests available for Speed Challenge.',
        },
      };
    }

    const { data: questionRows, error: questionsError } = await supabase
      .from('reading_questions')
      .select('id, prompt, instruction, options, correct_answer')
      .eq('test_id', testRow.id)
      .order('question_order', { ascending: true })
      .limit(10);

    if (questionsError || !questionRows || questionRows.length === 0) {
      return {
        props: {
          testTitle: testRow.title,
          testSlug: testRow.slug,
          questions: [],
          error: 'No questions found for Speed Challenge.',
        },
      };
    }

    const questions: SpeedQuestion[] = questionRows.map((row: any) => ({
      id: row.id,
      prompt: row.prompt ?? '',
      instruction: row.instruction ?? null,
      options: Array.isArray(row.options) ? (row.options as string[]) : null,
      correctAnswer:
        row.correct_answer != null ? String(row.correct_answer) : null,
    }));

    return {
      props: {
        testTitle: testRow.title,
        testSlug: testRow.slug,
        questions,
      },
    };
  } catch (err) {
    console.error('[speed challenge] error:', err);
    return {
      props: {
        testTitle: null,
        testSlug: null,
        questions: [],
        error:
          err instanceof Error ? err.message : 'Failed to load Speed Challenge.',
      },
    };
  }
};

export default SpeedChallengePage;
