// pages/mock/reading/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

import { ReadingForecastPanel } from '@/components/reading/ReadingForecastPanel';
import { AISummaryCard } from '@/components/reading/AISummaryCard';
import { DailyChallengeBanner } from '@/components/reading/daily/DailyChallengeBanner';
import { BandPredictorCard } from '@/components/reading/analytics/BandPredictorCard';

import type { ReadingAttemptSummary } from '@/lib/reading/bandPredictor';
import { computeDailyStreak } from '@/lib/reading/streak';

// ------------------------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------------------------
type ReadingMockListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  examType: string;
  difficulty: string | null;
  totalQuestions: number;
  totalPassages: number;
  durationSeconds: number;
  tags: string[];
};

type TestAttemptInfo = {
  latestBandScore: number | null;
  latestCreatedAt: string | null;
};

type ReadingStats = {
  totalAttempts: number;
  totalTestsAttempted: number;
  bestBand: number | null;
  avgBand: number | null;
  lastAttemptAt: string | null;
};

type PageProps = {
  tests: ReadingMockListItem[];
  attemptSummaries: ReadingAttemptSummary[];
  streakCurrent: number;
  stats: ReadingStats;
  attemptMap: Record<string, TestAttemptInfo>;
  error?: string;
};

// ------------------------------------------------------------------------------------

const ReadingMockIndexPage: NextPage<PageProps> = ({
  tests,
  attemptSummaries,
  streakCurrent,
  stats,
  attemptMap,
  error,
}) => {
  if (error) {
    return (
      <>
        <Head>
          <title>Error · Reading Mocks · GramorX</title>
        </Head>
        <Container className="py-10 max-w-4xl">
          <Card className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Icon name="AlertTriangle" className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Unable to load Reading mocks</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild>
              <Link href="/">
                <Icon name="Home" className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </Card>
        </Container>
      </>
    );
  }

  const hasAttempts = stats.totalAttempts > 0;

  const helperText = hasAttempts
    ? `You attempted ${stats.totalTestsAttempted} mock${
        stats.totalTestsAttempted === 1 ? '' : 's'
      }. Best band ${stats.bestBand ?? '--'}.`
    : `Start your first Reading Mock to unlock analytics.`;

  return (
    <>
      <Head>
        <title>IELTS Reading Mock Command Center</title>
      </Head>

      <main className="bg-lightBg dark:bg-dark/90">
        {/* ------------------------------------------------------------- */}
        {/* TOP HERO COMMAND BAR */}
        {/* ------------------------------------------------------------- */}
        <section className="border-b border-border/50 bg-card/70 backdrop-blur py-8">
          <Container>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left side */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-ds-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Icon name="BookOpen" size={14} />
                  <span>Reading Mock Suite</span>
                </div>

                <h1 className="font-slab text-h2 leading-tight">
                  Your Reading Mock Command Center.
                </h1>

                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Three passages. Forty questions. Strict timing. Cambridge-style academic
                  design with AI summaries, speed metrics, band prediction & attempt analytics.
                </p>

                <div className="text-xs text-muted-foreground">{helperText}</div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild size="md" variant="primary" className="rounded-ds-xl">
                    <Link href="#tests-list">Start a Reading Mock</Link>
                  </Button>
                  <Button asChild size="md" variant="secondary" className="rounded-ds-xl">
                    <Link href="/mock/reading/daily">Daily Reading Challenge</Link>
                  </Button>
                </div>
              </div>

              {/* Right side quick stats */}
              <Card className="p-5 rounded-ds-2xl border border-border/60 bg-card/80 shadow-sm w-full max-w-xs">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
                  Quick Stats
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className="text-lg font-semibold">{stats.bestBand ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg</p>
                    <p className="text-lg font-semibold">{stats.avgBand ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attempts</p>
                    <p className="text-lg font-semibold">{stats.totalAttempts}</p>
                  </div>
                </div>
              </Card>
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* DAILY CHALLENGE */}
        {/* ------------------------------------------------------------- */}
        <section className="py-8">
          <Container>
            <DailyChallengeBanner streakCurrent={streakCurrent} />
          </Container>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* GRID LAYOUT */}
        {/* ------------------------------------------------------------- */}
        <section className="pb-20">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]">
              {/* ------------------ LEFT: MOCK LIST ------------------ */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-slab text-xl">Reading Mock Library</h2>
                    <p className="text-xs text-muted-foreground">
                      All full-length Reading tests available.
                    </p>
                  </div>
                  {/* filter intentionally removed */}
                </div>

                <div id="tests-list" className="grid gap-5 md:grid-cols-2">
                  {tests.map((t) => {
                    const attempt = attemptMap[t.slug];

                    return (
                      <Card
                        key={t.id}
                        className="p-4 rounded-ds-2xl bg-card/70 border border-border/60 shadow-sm transition hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="neutral" size="xs">
                              {t.examType === 'gt' ? 'General Training' : 'Academic'}
                            </Badge>

                            {t.difficulty && (
                              <Badge variant="soft" size="xs">
                                {t.difficulty}
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                            {t.title}
                          </h3>

                          {/* no description, no repeated timing line */}

                          {!attempt ? (
                            <Badge variant="outline" size="xs" className="rounded-ds-xl">
                              <Icon name="EyeOff" className="h-3.5 w-3.5 mr-1" />
                              Not attempted
                            </Badge>
                          ) : (
                            <Badge variant="accent" size="xs" className="rounded-ds-xl">
                              <Icon name="CheckCircle" className="h-3.5 w-3.5 mr-1" />
                              Band {attempt.latestBandScore ?? '--'}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          {!attempt ? (
                            <Button
                              asChild
                              className="rounded-ds-xl text-xs font-semibold flex-1"
                              variant="primary"
                            >
                              <Link href={`/mock/reading/${t.slug}`}>Start Mock</Link>
                            </Button>
                          ) : (
                            <Button
                              asChild
                              className="rounded-ds-xl text-xs font-semibold flex-1"
                              variant="primary"
                            >
                              <Link href={`/mock/reading/history?test=${t.slug}`}>
                                View Attempts
                              </Link>
                            </Button>
                          )}

                          <Button
                            asChild
                            variant="secondary"
                            size="icon"
                            className="rounded-ds ml-2"
                          >
                            <Link href={`/mock/reading/history?test=${t.slug}`}>
                              <Icon name="History" className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* ------------------ RIGHT RAIL ------------------ */}
              <div className="space-y-6">
                <BandPredictorCard attempts={attemptSummaries} />

                <Card className="p-4 rounded-ds-2xl bg-card/80 border border-border/60 shadow-sm text-xs space-y-2">
                  <p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">
                    Reading Metrics
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Mocks available" value={tests.length} />
                    <Info label="Mocks attempted" value={stats.totalTestsAttempted} />
                    <Info label="Best band" value={stats.bestBand ?? '--'} />
                    <Info label="Avg band" value={stats.avgBand ?? '--'} />
                  </div>

                  {stats.lastAttemptAt && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Last attempt:{' '}
                      {new Date(stats.lastAttemptAt).toLocaleDateString()}
                    </p>
                  )}
                </Card>

                <Card className="p-4 rounded-ds-2xl bg-card/80 border border-border/60 shadow-sm text-xs space-y-3">
                  <p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">
                    Power Tools
                  </p>

                  <Tool href="/mock/reading/drill/question-type?type=TFNG" icon="Target">
                    Question-type drills
                  </Tool>
                  <Tool href="/mock/reading/drill/passage?test=any&p=1" icon="FileText">
                    Single-passage practice
                  </Tool>
                  <Tool href="/mock/reading/drill/speed" icon="Zap">
                    Speed training
                  </Tool>
                  <Tool href="/mock/reading/techniques" icon="BookOpen">
                    Techniques trainer
                  </Tool>
                  <Tool href="/mock/reading/analytics" icon="Activity">
                    Analytics & Weaknesses
                  </Tool>
                </Card>

                <ReadingForecastPanel />
                <AISummaryCard />
              </div>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
};

/* Helper Components */
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const Tool = ({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="flex justify-between items-center px-3 py-2 rounded-md border hover:bg-muted/70 transition-colors"
  >
    <span>{children}</span>
    <Icon name={icon} className="h-4 w-4" />
  </Link>
);

// ------------------------------------------------------------------------------------
// SSR
// ------------------------------------------------------------------------------------
export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  try {
    const supabase = getServerClient<Database>(ctx.req, ctx.res);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        redirect: {
          destination: '/login?next=/mock/reading',
          permanent: false,
        },
      };
    }

    // Load tests
    const { data: testsRows, error: testsErr } = await supabase
      .from('reading_tests')
      .select(
        'id, slug, title, description, exam_type, difficulty, total_questions, total_passages, duration_seconds, tags',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (testsErr) throw testsErr;

    let attemptSummaries: ReadingAttemptSummary[] = [];
    let attemptMap: Record<string, TestAttemptInfo> = {};
    let streakCurrent = 0;

    const stats: ReadingStats = {
      totalAttempts: 0,
      totalTestsAttempted: 0,
      bestBand: null,
      avgBand: null,
      lastAttemptAt: null,
    };

    // 🔑 Correct table: reading_attempts
    const { data: attempts, error: attemptsErr } = await supabase
      .from('reading_attempts')
      .select('id, test_id, raw_score, band_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (attemptsErr) throw attemptsErr;

    stats.totalAttempts = attempts.length;
    if (attempts.length > 0) stats.lastAttemptAt = attempts[0].created_at;

    attemptSummaries = attempts.map((a) => ({
      rawScore: Number(a.raw_score ?? 0),
      totalQuestions: 40,
      bandScore: a.band_score != null ? Number(a.band_score) : null,
      createdAt: a.created_at,
    }));

    const { currentStreak } = computeDailyStreak(
      attempts.map((a) => ({ date: a.created_at })),
    );
    streakCurrent = currentStreak;

    const bands = attempts
      .map((a) => (a.band_score != null ? Number(a.band_score) : null))
      .filter((v): v is number => typeof v === 'number');

    if (bands.length > 0) {
      stats.bestBand = Math.max(...bands);
      const avg = bands.reduce((acc, v) => acc + v, 0) / bands.length;
      stats.avgBand = Math.round((avg + Number.EPSILON) * 10) / 10;
    }

    const mapByTestId: Record<string, TestAttemptInfo> = {};
    for (const a of attempts) {
      if (!mapByTestId[a.test_id]) {
        mapByTestId[a.test_id] = {
          latestBandScore: a.band_score != null ? Number(a.band_score) : null,
          latestCreatedAt: a.created_at,
        };
      }
    }

    stats.totalTestsAttempted = Object.keys(mapByTestId).length;

    const testSlugMap = Object.fromEntries(
      (testsRows ?? []).map((t) => [t.id, t.slug]),
    );

    const finalMap: Record<string, TestAttemptInfo> = {};
    Object.entries(mapByTestId).forEach(([testId, info]) => {
      const slug = testSlugMap[testId];
      if (slug) finalMap[slug] = info;
    });

    attemptMap = finalMap;

    const tests: ReadingMockListItem[] =
      testsRows?.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        description: t.description ?? null,
        examType: t.exam_type,
        difficulty: t.difficulty,
        totalQuestions: t.total_questions ?? 40,
        totalPassages: t.total_passages ?? 3,
        durationSeconds: t.duration_seconds ?? 3600,
        tags: t.tags ?? [],
      })) ?? [];

    return {
      props: {
        tests,
        attemptSummaries,
        streakCurrent,
        stats,
        attemptMap,
      },
    };
  } catch (err: any) {
    return {
      props: {
        tests: [],
        attemptSummaries: [],
        streakCurrent: 0,
        stats: {
          totalAttempts: 0,
          totalTestsAttempted: 0,
          bestBand: null,
          avgBand: null,
          lastAttemptAt: null,
        },
        attemptMap: {},
        error: err?.message ?? 'Failed to load Reading mocks.',
      },
    };
  }
};

export default ReadingMockIndexPage;
