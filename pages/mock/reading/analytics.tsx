// pages/mock/reading/analytics.tsx
import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';

import {
  computeAccuracyByQuestionType,
  computeAttemptsTimeline,
  computeTimePerQuestionStats,
} from '@/lib/reading/analytics';

type AttemptsRow = {
  id: string;
  test_id: string;
  created_at: string;
  raw_score: number | null;
  question_count: number | null;
  duration_seconds: number | null;
  section_stats: any;
};

type QuestionTypeAccuracy = {
  questionTypeId: string;
  questionTypeLabel: string;
  attempts: number;
  accuracy: number;
};

type TimelinePoint = {
  attemptId: string;
  createdAt: string;
  rawScore: number | null;
  questionCount: number | null;
  bandScore: number | null;
};

type TimePerQuestionStat = {
  questionTypeId: string;
  avgSeconds: number | null;
};

type PageProps = {
  hasData: boolean;
  accuracyByType: QuestionTypeAccuracy[];
  timeline: TimelinePoint[];
  timeStats: TimePerQuestionStat[];
};

const ReadingAnalyticsPage: NextPage<PageProps> = ({
  hasData,
  accuracyByType,
  timeline,
  timeStats,
}) => {
  return (
    <>
      <Head>
        <title>Reading Analytics · GramorX</title>
      </Head>
      <section className="py-10 bg-background">
        <Container className="max-w-4xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge size="xs" variant="outline">
                Analytics
              </Badge>
              <h1 className="text-xl font-semibold tracking-tight">
                Reading analytics & weak spots
              </h1>
              <p className="text-xs text-muted-foreground max-w-xl">
                See which question types are destroying your score, how consistent you are, and
                where to drill next.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href="/mock/reading">
                <Icon name="arrow-left" className="h-4 w-4 mr-1" />
                Back to Reading mocks
              </a>
            </Button>
          </div>

          {!hasData && (
            <Card className="p-4 text-sm text-muted-foreground space-y-2">
              <p>You haven’t completed any Reading mock attempts yet.</p>
              <p className="text-xs">
                Do at least one full mock so we can analyse your strengths and weaknesses.
              </p>
            </Card>
          )}

          {hasData && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Accuracy by question type</h2>
                  <Icon name="target" className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  This is based on your last few Reading attempts. Focus first on types with many
                  questions and low accuracy.
                </p>
                <div className="mt-2 space-y-2">
                  {accuracyByType.map((row) => (
                    <div key={row.questionTypeId} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {row.questionTypeLabel || row.questionTypeId}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {row.attempts} questions
                        </span>
                      </div>
                      <span className="text-xs font-semibold">
                        {row.accuracy.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  {!accuracyByType.length && (
                    <p className="text-xs text-muted-foreground">
                      Not enough data yet. Do a few more strict mocks.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Time per question</h2>
                  <Icon name="clock" className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Slower than 90 seconds on a question type? You might be over-reading. Faster than
                  30 seconds with low accuracy? You&apos;re probably rushing.
                </p>
                <div className="mt-2 space-y-2">
                  {timeStats.map((row) => (
                    <div key={row.questionTypeId} className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {row.questionTypeId.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.avgSeconds != null ? `${row.avgSeconds.toFixed(1)}s / question` : '—'}
                      </span>
                    </div>
                  ))}
                  {!timeStats.length && (
                    <p className="text-xs text-muted-foreground">
                      Not enough timing data yet.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-4 space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Recent Reading attempts</h2>
                  <Icon name="line-chart" className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Track how your raw score and band are moving over time. Use this to see if your
                  practice is actually working.
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  {timeline.map((t) => (
                    <div
                      key={t.attemptId}
                      className="flex items-center justify-between border-b border-border/60 py-1 last:border-b-0"
                    >
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                      <span className="font-medium">
                        {t.rawScore ?? '—'}
                        {t.questionCount ? `/${t.questionCount}` : null}{' '}
                        {t.bandScore != null ? `· Band ${t.bandScore.toFixed(1)}` : ''}
                      </span>
                    </div>
                  ))}
                  {!timeline.length && (
                    <p className="text-xs text-muted-foreground">
                      No attempts in the window we looked at.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: { destination: '/login', permanent: false },
    };
  }

  // Get last N attempts for this user
  const { data: attemptsRows } = await supabase
    .from('attempts_reading')
    .select('id, test_id, created_at, raw_score, question_count, duration_seconds, section_stats')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const attempts: AttemptsRow[] = (attemptsRows ?? []) as any[];
  const hasData = attempts.length > 0;

  if (!hasData) {
    return {
      props: {
        hasData: false,
        accuracyByType: [],
        timeline: [],
        timeStats: [],
      },
    };
  }

  const accuracyByType = computeAccuracyByQuestionType(attempts) as QuestionTypeAccuracy[];
  const timeline = computeAttemptsTimeline(attempts) as TimelinePoint[];
  const timeStats = computeTimePerQuestionStats(attempts) as TimePerQuestionStat[];

  return {
    props: {
      hasData: true,
      accuracyByType,
      timeline,
      timeStats,
    },
  };
};

export default ReadingAnalyticsPage;
