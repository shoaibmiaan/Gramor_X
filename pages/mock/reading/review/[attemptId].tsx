// pages/mock/reading/review/[attemptId].tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';
import type {
  ReadingTest,
  ReadingPassage,
  ReadingQuestion,
} from '@/lib/reading/types';

import { ReadingReviewShell } from '@/components/reading/review/ReadingReviewShell';

type ReviewAnswer = {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string | string[] | null;
};

type AttemptForReview = {
  id: string;
  rawScore: number | null;
  bandScore: number | null;
  questionCount: number | null;
  createdAt: string;
  durationSeconds: number | null;
};

type AttemptNeighborSummary = {
  id: string;
  bandScore: number | null;
  createdAt: string;
};

type PageProps = {
  test: ReadingTest | null;
  passages: ReadingPassage[];
  questions: ReadingQuestion[];
  attempt: AttemptForReview | null;
  answers: ReviewAnswer[];
  totalModuleAttempts: number;
  totalTestAttempts: number;
  previousAttempt: AttemptNeighborSummary | null;
  nextAttempt: AttemptNeighborSummary | null;
};

const ReadingReviewPage: NextPage<PageProps> = ({
  test,
  passages,
  questions,
  attempt,
  answers,
  totalModuleAttempts,
  totalTestAttempts,
  previousAttempt,
  nextAttempt,
}) => {
  const notFound = !test || !attempt;

  if (notFound) {
    return (
      <>
        <Head>
          <title>Reading review · GramorX</title>
        </Head>

        <main className="bg-lightBg dark:bg-dark">
          <section className="py-24">
            <Container className="max-w-xl">
              <Card className="rounded-ds-2xl border border-border bg-card/90 p-10 text-center shadow-sm space-y-5">
                <div className="flex justify-center">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <Icon name="AlertTriangle" size={20} />
                  </span>
                </div>

                <p className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                  Review not available
                </p>
                <p className="text-sm text-muted-foreground">
                  This attempt doesn&apos;t exist or you don&apos;t have access.
                </p>

                <div className="pt-3 flex justify-center">
                  <Link
                    href="/mock/reading"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Go back to Reading mocks
                  </Link>
                </div>
              </Card>
            </Container>
          </section>
        </main>
      </>
    );
  }

  // ---- Derived stats for AI-style insights ----
  const totalQuestions = answers.length || attempt.questionCount || 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const incorrectCount = totalQuestions > 0 ? totalQuestions - correctCount : 0;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : null;

  const avgSecondsPerQuestion =
    totalQuestions > 0 && attempt.durationSeconds != null
      ? Math.round(attempt.durationSeconds / totalQuestions)
      : null;

  // Weak tags from incorrect answers (based on question.tags)
  const weakTagCounts: Record<string, number> = {};
  answers.forEach((answer) => {
    if (answer.isCorrect) return;
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question || !question.tags) return;
    for (const tag of question.tags) {
      if (!tag) continue;
      weakTagCounts[tag] = (weakTagCounts[tag] ?? 0) + 1;
    }
  });

  const weakTagsSorted = Object.entries(weakTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const hasWeakTags = weakTagsSorted.length > 0;

  return (
    <>
      <Head>
        <title>Review – {test.title} · Reading Mock · GramorX</title>
      </Head>

      <main className="bg-lightBg dark:bg-gradient-to-b dark:from-dark/90 dark:to-darker">
        <section className="pb-20 pt-10 md:pt-14">
          <Container className="max-w-6xl space-y-6">
            {/* ========= HEADER (short) ========= */}
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-ds-full bg-card/80 px-3 py-[5px] text-[11px] font-medium text-muted-foreground ring-1 ring-border/60">
                <Icon name="BookOpenCheck" size={13} />
                <span>Reading Review</span>
              </div>

              <h1 className="font-slab text-h3 md:text-h2 leading-tight text-foreground">
                {test.title}
              </h1>
            </header>

            {/* ========= INSIGHTS STRIP ========= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {/* Accuracy */}
              <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-3.5 md:p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Accuracy
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-foreground">
                    {accuracy != null ? `${accuracy}%` : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {correctCount}/{totalQuestions} correct
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
                  <Icon name="Sparkles" size={18} />
                </span>
              </Card>

              {/* Time per question */}
              <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-3.5 md:p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Time per question
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-lg md:text-xl font-semibold text-foreground">
                    {avgSecondsPerQuestion != null ? `${avgSecondsPerQuestion}s` : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Total time ~
                    {attempt.durationSeconds != null
                      ? ` ${Math.round(attempt.durationSeconds / 60)} min`
                      : ' —'}
                  </p>
                </div>
              </Card>

              {/* AI next step + CTAs */}
              <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-3.5 md:p-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    AI-style next step
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {accuracy == null
                      ? 'Finish a full attempt to unlock insights.'
                      : accuracy >= 80
                        ? 'You’re close. Hit this mock again and focus only on weak tags.'
                        : accuracy >= 60
                          ? 'Your main gains are in repeated mistake patterns. Clean those up next attempt.'
                          : 'You need reps. Do 2–3 shorter mocks targeting weak question types.'}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {/* Retry SAME mock */}
                  <Link
                    href={`/mock/reading/start?testId=${test.id}&retry=1`}
                    className="inline-flex items-center gap-1 rounded-ds-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="RotateCcw" size={12} />
                    Retake this mock
                  </Link>

                  {/* Retry NEW mock */}
                  <Link
                    href="/mock/reading"
                    className="inline-flex items-center gap-1 rounded-ds-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="Shuffle" size={12} />
                    Try a different Reading mock
                  </Link>

                  <Link
                    href="/mock"
                    className="inline-flex items-center gap-1 rounded-ds-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="LayoutTemplate" size={12} />
                    Mock dashboard
                  </Link>
                </div>
              </Card>
            </div>

            {/* ========= MAIN GRID ========= */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-10">
              {/* ===== LEFT STICKY SUMMARY ===== */}
              <aside className="lg:sticky lg:top-24 space-y-4 h-max">
                {/* Core summary + attempts */}
                <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Band score
                      </p>
                      <p className="text-xl font-semibold text-foreground">
                        {attempt.bandScore?.toFixed(1) ?? '—'}
                      </p>
                    </div>
                    <Badge variant="accent" size="xs">
                      Reading
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Questions
                    </p>
                    <p className="text-sm font-medium">
                      {totalQuestions || '—'} total · {incorrectCount} wrong
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border/50">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Attempts
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Reading module attempts:{' '}
                      <span className="font-medium">{totalModuleAttempts}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Attempts on this test:{' '}
                      <span className="font-medium">{totalTestAttempts}</span>
                    </p>
                  </div>

                  <details className="text-xs pt-2 border-t border-border/50">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                      More attempt details
                    </summary>
                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground/80">
                      <p>Attempted: {new Date(attempt.createdAt).toLocaleString()}</p>
                      <p>
                        Duration:{' '}
                        {attempt.durationSeconds != null
                          ? `${Math.round(attempt.durationSeconds / 60)} min`
                          : '—'}
                      </p>
                      {attempt.rawScore != null && <p>Raw score: {attempt.rawScore}</p>}
                    </div>
                  </details>
                </Card>

                {/* Band history before / after this attempt */}
                <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Band history on this test
                    </p>
                    <Icon name="TrendingUp" size={14} className="text-muted-foreground" />
                  </div>

                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    {previousAttempt ? (
                      <p>
                        Before this: Band{' '}
                        <span className="font-semibold">
                          {previousAttempt.bandScore?.toFixed(1) ?? '—'}
                        </span>{' '}
                        on{' '}
                        {new Date(previousAttempt.createdAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p>This was your first attempt on this test.</p>
                    )}

                    <p>
                      This attempt: Band{' '}
                      <span className="font-semibold">
                        {attempt.bandScore?.toFixed(1) ?? '—'}
                      </span>
                    </p>

                    {nextAttempt ? (
                      <p>
                        After this: Band{' '}
                        <span className="font-semibold">
                          {nextAttempt.bandScore?.toFixed(1) ?? '—'}
                        </span>{' '}
                        on {new Date(nextAttempt.createdAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p>No later attempt yet on this test.</p>
                    )}
                  </div>
                </Card>

                {/* Weak tags breakdown */}
                <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Weak patterns
                    </p>
                    <Icon name="Target" size={14} className="text-muted-foreground" />
                  </div>

                  {hasWeakTags ? (
                    <ul className="space-y-2 text-xs">
                      {weakTagsSorted.map(([tag, count]) => (
                        <li
                          key={tag}
                          className="flex items-center justify-between rounded-ds-lg bg-background/60 px-2.5 py-1.5"
                        >
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            {tag}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {count} mistake{count > 1 ? 's' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      No repeated weak tags detected in this attempt.
                    </p>
                  )}

                  <p className="text-[11px] text-muted-foreground/80">
                    Use these tags to build your next practice set.
                  </p>
                </Card>

                {/* Quick actions: same mock / new mock / switch */}
                <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Next moves
                  </p>
                  <div className="space-y-2 text-xs">
                    <Link
                      href={`/mock/reading/start?testId=${test.id}&retry=1`}
                      className="flex items-center justify-between rounded-ds-lg bg-background/70 px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="RotateCcw" size={12} />
                        Retake this exact mock
                      </span>
                      <Icon name="ChevronRight" size={12} />
                    </Link>
                    <Link
                      href="/mock/reading"
                      className="flex items-center justify-between rounded-ds-lg bg-background/70 px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="Shuffle" size={12} />
                        Try a different Reading mock
                      </span>
                      <Icon name="ChevronRight" size={12} />
                    </Link>
                    <Link
                      href="/mock"
                      className="flex items-center justify-between rounded-ds-lg bg-background/70 px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="Grid3X3" size={12} />
                        Switch module
                      </span>
                      <Icon name="ChevronRight" size={12} />
                    </Link>
                  </div>
                </Card>
              </aside>

              {/* ===== RIGHT MAIN REVIEW AREA ===== */}
              <div id="review-start" className="space-y-4">
                <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 md:p-6 shadow-sm">
                  <ReadingReviewShell
                    test={test}
                    passages={passages}
                    questions={questions}
                    attempt={attempt}
                    answers={answers}
                  />
                </Card>
              </div>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
};

// ------------------------------
// SERVER-SIDE FETCH
// ------------------------------

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const attemptIdParam = ctx.params?.attemptId;
  if (!attemptIdParam || typeof attemptIdParam !== 'string') {
    return {
      props: {
        test: null,
        passages: [],
        questions: [],
        attempt: null,
        answers: [],
        totalModuleAttempts: 0,
        totalTestAttempts: 0,
        previousAttempt: null,
        nextAttempt: null,
      },
    };
  }

  const supabase = getServerClient(ctx.req, ctx.res);

  type AttemptRow = Database['public']['Tables']['reading_attempts']['Row'];
  type TestRow = Database['public']['Tables']['reading_tests']['Row'];
  type PassageRow = Database['public']['Tables']['reading_passages']['Row'];
  type QuestionRow = Database['public']['Tables']['reading_questions']['Row'];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: {
        destination: '/login?role=student',
        permanent: false,
      },
    };
  }

  // Attempt
  const { data: attemptRow, error: attemptError } = await supabase
    .from('reading_attempts')
    .select('*')
    .eq('id', attemptIdParam)
    .maybeSingle<AttemptRow>();

  if (attemptError || !attemptRow || attemptRow.user_id !== user.id) {
    // eslint-disable-next-line no-console
    console.error('reading_review: attempt error or forbidden', attemptError);
    return {
      props: {
        test: null,
        passages: [],
        questions: [],
        attempt: null,
        answers: [],
        totalModuleAttempts: 0,
        totalTestAttempts: 0,
        previousAttempt: null,
        nextAttempt: null,
      },
    };
  }

  // Test
  const { data: testRow, error: testError } = await supabase
    .from('reading_tests')
    .select('*')
    .eq('id', attemptRow.test_id)
    .maybeSingle<TestRow>();

  if (testError || !testRow) {
    // eslint-disable-next-line no-console
    console.error('reading_review: test error', testError);
    return {
      props: {
        test: null,
        passages: [],
        questions: [],
        attempt: null,
        answers: [],
        totalModuleAttempts: 0,
        totalTestAttempts: 0,
        previousAttempt: null,
        nextAttempt: null,
      },
    };
  }

  const test: ReadingTest = {
    id: testRow.id,
    slug: testRow.slug,
    title: testRow.title,
    description: testRow.description,
    examType: testRow.exam_type,
    durationSeconds: testRow.duration_seconds ?? 3600,
    createdAt: testRow.created_at,
    updatedAt: testRow.updated_at,
  };

  // Passages + Questions
  const [{ data: passageRows, error: pErr }, { data: questionRows, error: qErr }] =
    await Promise.all([
      supabase
        .from('reading_passages')
        .select('*')
        .eq('test_id', testRow.id)
        .order('passage_order', { ascending: true }),
      supabase
        .from('reading_questions')
        .select('*')
        .eq('test_id', testRow.id)
        .order('question_order', { ascending: true }),
    ]);

  if (pErr || qErr) {
    // eslint-disable-next-line no-console
    console.error('reading_review: passage/question error', pErr, qErr);
  }

  const passages: ReadingPassage[] =
    (passageRows ?? []).map((row: PassageRow) => ({
      id: row.id,
      testId: row.test_id,
      passageOrder: row.passage_order,
      title: row.title,
      subtitle: row.subtitle,
      content: row.content,
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) ?? [];

  const questions: ReadingQuestion[] =
    (questionRows ?? []).map((row: QuestionRow) => ({
      id: row.id,
      testId: row.test_id,
      passageId: row.passage_id,
      questionOrder: row.question_order,
      questionTypeId: row.question_type_id as any,
      prompt: row.prompt,
      instruction: row.instruction,
      correctAnswer: row.correct_answer as any,
      constraintsJson: (row.constraints_json ?? {}) as Record<string, unknown>,
      tags: row.tags ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) ?? [];

  // Answers from attempt.meta.answers
  const meta = (attemptRow.meta as any) || {};
  const answersMap: Record<string, any> = meta.answers ?? {};

  const reviewAnswers: ReviewAnswer[] = questions.map((q) => {
    const selected = answersMap[q.id] ?? null;
    const correct = (q as any).correctAnswer;

    let isCorrect = false;

    if (correct == null) {
      isCorrect = false;
    } else if (typeof correct === 'string') {
      isCorrect = selected != null && selected === correct;
    } else if (Array.isArray(correct)) {
      if (Array.isArray(selected)) {
        const givenSet = new Set(selected as any[]);
        isCorrect = (correct as any[]).every((v) => givenSet.has(v));
      }
    } else if (
      typeof correct === 'object' &&
      selected &&
      typeof selected === 'object'
    ) {
      const cObj = correct as Record<string, any>;
      const gObj = selected as Record<string, any>;
      const keys = Object.keys(cObj);
      isCorrect = keys.every((k) => gObj[k] === cObj[k]);
    }

    let selectedAnswer: string | string[] | null = null;
    if (selected == null) {
      selectedAnswer = null;
    } else if (typeof selected === 'string') {
      selectedAnswer = selected;
    } else if (Array.isArray(selected)) {
      selectedAnswer = selected as string[];
    } else {
      selectedAnswer = String(selected);
    }

    return {
      questionId: q.id,
      isCorrect,
      selectedAnswer,
    };
  });

  const sectionStats = (attemptRow.section_stats as any) || {};
  const attempt: AttemptForReview = {
    id: attemptRow.id,
    rawScore: attemptRow.raw_score,
    bandScore: attemptRow.band_score,
    questionCount: sectionStats.totalQuestions ?? null,
    durationSeconds: attemptRow.duration_seconds,
    createdAt: attemptRow.started_at ?? attemptRow.created_at,
  };

  // ---- All attempts for this user (module + test history) ----
  type AttemptLite = Pick<
    AttemptRow,
    'id' | 'test_id' | 'band_score' | 'started_at' | 'created_at'
  >;

  const { data: allAttemptsRaw, error: allAttemptsError } = await supabase
    .from('reading_attempts')
    .select('id, test_id, band_score, started_at, created_at')
    .eq('user_id', user.id);

  if (allAttemptsError) {
    // eslint-disable-next-line no-console
    console.error('reading_review: allAttempts error', allAttemptsError);
  }

  const allAttempts = (allAttemptsRaw ?? []) as AttemptLite[];

  const attemptsForThisTest = allAttempts.filter(
    (a) => a.test_id === attemptRow.test_id
  );

  const totalModuleAttempts = allAttempts.length;
  const totalTestAttempts = attemptsForThisTest.length;

  const sortedForThisTest = [...attemptsForThisTest].sort((a, b) => {
    const aTime = (a.started_at ?? a.created_at) ?? '';
    const bTime = (b.started_at ?? b.created_at) ?? '';
    if (!aTime && !bTime) return 0;
    if (!aTime) return -1;
    if (!bTime) return 1;
    return aTime.localeCompare(bTime);
  });

  const idx = sortedForThisTest.findIndex((a) => a.id === attemptRow.id);
  const prevRow = idx > 0 ? sortedForThisTest[idx - 1] : null;
  const nextRow =
    idx >= 0 && idx < sortedForThisTest.length - 1
      ? sortedForThisTest[idx + 1]
      : null;

  const previousAttempt: AttemptNeighborSummary | null = prevRow
    ? {
        id: prevRow.id,
        bandScore: prevRow.band_score,
        createdAt: (prevRow.started_at ?? prevRow.created_at) ?? attempt.createdAt,
      }
    : null;

  const nextAttempt: AttemptNeighborSummary | null = nextRow
    ? {
        id: nextRow.id,
        bandScore: nextRow.band_score,
        createdAt: (nextRow.started_at ?? nextRow.created_at) ?? attempt.createdAt,
      }
    : null;

  return {
    props: {
      test,
      passages,
      questions,
      attempt,
      answers: reviewAnswers,
      totalModuleAttempts,
      totalTestAttempts,
      previousAttempt,
      nextAttempt,
    },
  };
};

export default ReadingReviewPage;
