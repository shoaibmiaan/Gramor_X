// pages/mock/reading/[slug]/result.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';
import type { ReadingTest } from '@/lib/reading/types';
import { ReadingAnswerSheetGrid } from '@/components/reading/answer-sheet/ReadingAnswerSheetGrid';
import { ReadingReviewSummaryBar } from '@/components/reading/review/ReadingReviewSummaryBar';
import { BandPredictorCard } from '@/components/reading/analytics/BandPredictorCard';
import type { ReadingAttemptSummary } from '@/lib/reading/bandPredictor';

type AttemptForResult = {
  id: string;
  rawScore: number;
  bandScore: number;
  questionCount: number;
  createdAt: string;
  durationSeconds: number | null;
};

type PageProps = {
  test: ReadingTest | null;
  attempt: AttemptForResult | null;
  answerSheet: Record<number, string | string[] | null>;
  attemptSummaries: ReadingAttemptSummary[];
};

const ReadingResultPage: NextPage<PageProps> = ({
  test,
  attempt,
  answerSheet,
  attemptSummaries,
}) => {
  if (!test || !attempt) {
    return (
      <>
        <Head>
          <title>Reading Result · GramorX</title>
        </Head>
        <section className="py-16 bg-background">
          <Container className="max-w-3xl">
            <Card className="p-6 space-y-3 text-sm text-muted-foreground">
              <p>No completed Reading attempt found for this test.</p>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/mock/reading">
                    <Icon name="arrow-left" className="h-4 w-4 mr-1" />
                    Back to Reading mocks
                  </Link>
                </Button>
              </div>
            </Card>
          </Container>
        </section>
      </>
    );
  }

  const totalQuestions = attempt.questionCount || 40;

  return (
    <>
      <Head>
        <title>
          Result – {test.title} · Reading Mock · GramorX
        </title>
      </Head>

      <section className="py-10 bg-background">
        <Container className="max-w-5xl space-y-6">
          <ReadingReviewSummaryBar
            testTitle={test.title}
            bandScore={attempt.bandScore}
            rawScore={attempt.rawScore}
            totalQuestions={totalQuestions}
            createdAt={attempt.createdAt}
            durationSeconds={attempt.durationSeconds ?? undefined}
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
            {/* Answer sheet */}
            <div className="space-y-3">
              <ReadingAnswerSheetGrid
                totalQuestions={totalQuestions}
                answers={answerSheet}
              />

              <Card className="p-3 text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium">
                  Next steps
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Review every mistake with AI explanations to fix logic, not just memorize
                    answers.
                  </li>
                  <li>
                    Do a question-type drill for your weakest area (TFNG / headings / matching).
                  </li>
                  <li>
                    Track your progress in the Reading analytics page.
                  </li>
                </ul>
              </Card>
            </div>

            {/* Right side: band predictor + actions */}
            <div className="space-y-3">
              <BandPredictorCard attempts={attemptSummaries} />

              <Card className="p-3 space-y-2 text-xs">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={`/mock/reading/review/${attempt.id}`}>
                      <Icon name="eye" className="h-4 w-4 mr-1" />
                      Review this attempt
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/mock/reading/analytics">
                      <Icon name="activity" className="h-4 w-4 mr-1" />
                      Open Reading analytics
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/mock/reading">
                      <Icon name="arrow-left" className="h-4 w-4 mr-1" />
                      Back to Reading mocks
                    </Link>
                  </Button>
                </div>

                <div className="pt-2 border-t mt-2 flex items-center gap-2">
                  <Badge size="xs" variant="outline">
                    Tip
                  </Badge>
                  <p className="text-[11px] text-muted-foreground">
                    Don’t spam tests. One full mock + deep review beats three rushed attempts.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient<Database>(ctx);

  const slugParam = ctx.params?.slug;
  if (typeof slugParam !== 'string') {
    return { notFound: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const { data: testRow } = await supabase
    .from('reading_tests')
    .select('*')
    .eq('slug', slugParam)
    .maybeSingle();

  if (!testRow) {
    return {
      props: {
        test: null,
        attempt: null,
        answerSheet: {},
        attemptSummaries: [],
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

  // Latest attempt for this test
  const { data: attemptRow } = await supabase
    .from('attempts_reading')
    .select('*')
    .eq('user_id', user.id)
    .eq('test_id', test.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attemptRow) {
    return {
      props: {
        test,
        attempt: null,
        answerSheet: {},
        attemptSummaries: [],
      },
    };
  }

  const attempt: AttemptForResult = {
    id: attemptRow.id,
    rawScore: attemptRow.raw_score ?? 0,
    bandScore: attemptRow.band_score ?? 0,
    questionCount: attemptRow.question_count ?? 40,
    createdAt: attemptRow.created_at,
    durationSeconds: attemptRow.duration_seconds ?? null,
  };

  // Build answer sheet overview – map question_order -> selected answer
  const [{ data: questionRows }, { data: answerRows }] = await Promise.all([
    supabase
      .from('reading_questions')
      .select('id, question_order')
      .eq('test_id', test.id),
    supabase
      .from('attempts_reading_answers')
      .select('question_id, selected_answer')
      .eq('attempt_id', attempt.id),
  ]);

  const orderByQuestionId = new Map<string, number>();
  (questionRows ?? []).forEach((q) => {
    orderByQuestionId.set(q.id, q.question_order ?? 0);
  });

  const answerSheet: Record<number, string | string[] | null> = {};
  (answerRows ?? []).forEach((a) => {
    const order = orderByQuestionId.get(a.question_id);
    if (!order) return;
    const val = a.selected_answer as any;
    answerSheet[order] = val;
  });

  // Build attempt summaries for band predictor (all reading attempts for this user)
  const { data: allAttemptsRows } = await supabase
    .from('attempts_reading')
    .select('raw_score, band_score, question_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const attemptSummaries: ReadingAttemptSummary[] =
    (allAttemptsRows ?? []).map((a) => ({
      rawScore: a.raw_score ?? 0,
      totalQuestions: a.question_count ?? 40,
      bandScore: a.band_score,
      createdAt: a.created_at,
    })) ?? [];

  return {
    props: {
      test,
      attempt,
      answerSheet,
      attemptSummaries,
    },
  };
};

export default ReadingResultPage;
