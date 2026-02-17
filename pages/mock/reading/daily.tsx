// pages/mock/reading/daily/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';

import { getServerClient } from '@/lib/supabaseServer';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type DailyChallengeTest = {
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
  isDailyChallenge: boolean;
  challengeDate: string;
};

type PageProps = {
  dailyTest: DailyChallengeTest | null;
  hasAttemptedToday: boolean;
  streakCurrent: number;
  error?: string;
};

const DailyChallengePage: NextPage<PageProps> = ({
  dailyTest,
  hasAttemptedToday,
  streakCurrent,
  error,
}) => {
  const router = useRouter();

  if (error) {
    return (
      <>
        <Head>
          <title>Error · Daily Challenge · GramorX</title>
        </Head>
        <section className="py-10 bg-background">
          <Container className="max-w-5xl space-y-6">
            <Card className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Icon name="alert-triangle" className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Unable to load daily challenge</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button asChild>
                  <Link href="/mock/reading">
                    <Icon name="arrow-left" className="h-4 w-4 mr-2" />
                    Back to Reading
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">
                    <Icon name="home" className="h-4 w-4 mr-2" />
                    Go Home
                  </Link>
                </Button>
              </div>
            </Card>
          </Container>
        </section>
      </>
    );
  }

  const handleStartChallenge = () => {
    if (!dailyTest) return;

    if (hasAttemptedToday) {
      router.push(`/mock/reading/${dailyTest.slug}/review`);
    } else {
      router.push(`/mock/reading/${dailyTest.slug}?daily=true`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <Head>
        <title>Daily Challenge · Reading Mocks · GramorX</title>
      </Head>
      <Container className="py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href="/mock/reading">
                  <Icon name="arrow-left" className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">
                Daily Reading Challenge
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete today&apos;s special reading passage to maintain your streak
            </p>
          </div>

          <div className="flex items-center gap-3">
            {streakCurrent > 0 && (
              <Badge variant="subtle" className="rounded-ds-xl">
                <Icon name="flame" className="mr-1 h-3 w-3" />
                {streakCurrent} day streak
              </Badge>
            )}
            <Badge variant="outline" className="rounded-ds-xl">
              <Icon name="calendar" className="mr-1 h-3 w-3" />
              {formatDate(new Date().toISOString().split('T')[0])}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        {dailyTest ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
            {/* Challenge Card */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="uppercase rounded-ds text-xs">
                      {dailyTest.examType === 'gt' ? 'General Training' : 'Academic'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="subtle"
                        className="rounded-ds text-xs bg-primary/10 text-primary"
                      >
                        <Icon name="zap" className="mr-1 h-3 w-3" />
                        Daily Challenge
                      </Badge>
                      {dailyTest.difficulty && (
                        <Badge variant="outline" className="rounded-ds text-xs">
                          {dailyTest.difficulty}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">{dailyTest.title}</h2>
                    {dailyTest.description && (
                      <p className="text-sm text-muted-foreground">
                        {dailyTest.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-y">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{dailyTest.totalQuestions}</div>
                      <div className="text-xs text-muted-foreground">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{dailyTest.totalPassages}</div>
                      <div className="text-xs text-muted-foreground">Passages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {Math.round(dailyTest.durationSeconds / 60)}
                      </div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                  </div>

                  {dailyTest.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {dailyTest.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="rounded-ds text-xs px-2 py-1"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  {hasAttemptedToday ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon name="check-circle" className="h-4 w-4 text-green-600" />
                        <span>You&apos;ve already completed today&apos;s challenge!</span>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleStartChallenge}
                          variant="secondary"
                          className="flex-1"
                        >
                          <Icon name="eye" className="h-4 w-4 mr-2" />
                          Review Your Attempt
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/mock/reading">
                            <Icon name="book-open" className="h-4 w-4 mr-2" />
                            Try Another Mock
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={handleStartChallenge} size="lg" className="w-full">
                      <Icon name="play-circle" className="h-5 w-5 mr-2" />
                      Start Today&apos;s Challenge
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Side Panel */}
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Daily Challenge Rules</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>One challenge per day resets at midnight UTC</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Complete to maintain your streak</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>AI feedback available after completion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Special bonus for 7+ day streaks</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Streak</span>
                    <Badge variant="subtle">{streakCurrent} days</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Today&apos;s Status</span>
                    {hasAttemptedToday ? (
                      <Badge
                        variant="subtle"
                        className="bg-green-500/10 text-green-700"
                      >
                        Completed
                      </Badge>
                    ) : (
                      <Badge
                        variant="subtle"
                        className="bg-amber-500/10 text-amber-700"
                      >
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/mock/reading/history">
                        <Icon name="history" className="h-4 w-4 mr-2" />
                        View Challenge History
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-muted mb-4">
              <Icon name="calendar-off" className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Daily Challenge Available</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              There&apos;s no daily challenge scheduled for today. Check back tomorrow or try a
              regular reading mock.
            </p>
            <Button asChild>
              <Link href="/mock/reading">
                <Icon name="book-open" className="h-4 w-4 mr-2" />
                Browse Reading Mocks
              </Link>
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

    // Get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        redirect: {
          destination:
            '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl ?? '/mock/reading/daily'),
          permanent: false,
        },
      };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get today's daily challenge from reading_daily_challenges table (must exist in DB)
    const { data: dailyChallengeRow } = await supabase
      .from('reading_daily_challenges')
      .select(
        `
        id,
        challenge_date,
        test_id,
        reading_tests (
          id,
          slug,
          title,
          description,
          exam_type,
          difficulty,
          total_questions,
          total_passages,
          duration_seconds,
          tags
        )
      `,
      )
      .eq('challenge_date', today)
      .maybeSingle();

    let dailyTest: DailyChallengeTest | null = null;
    let hasAttemptedToday = false;
    let streakCurrent = 0;

    if (dailyChallengeRow && (dailyChallengeRow as any).reading_tests) {
      const test = (dailyChallengeRow as any).reading_tests;
      dailyTest = {
        id: test.id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        examType: test.exam_type,
        difficulty: test.difficulty,
        totalQuestions: test.total_questions ?? 40,
        totalPassages: test.total_passages ?? 3,
        durationSeconds: test.duration_seconds ?? 3600,
        tags: test.tags ?? [],
        isDailyChallenge: true,
        challengeDate: dailyChallengeRow.challenge_date,
      };
    } else {
      // Fallback: get any active test for today
      const { data: randomTest } = await supabase
        .from('reading_tests')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (randomTest) {
        dailyTest = {
          id: randomTest.id,
          slug: randomTest.slug,
          title: randomTest.title,
          description: randomTest.description,
          examType: randomTest.exam_type,
          difficulty: randomTest.difficulty,
          totalQuestions: randomTest.total_questions ?? 40,
          totalPassages: randomTest.total_passages ?? 3,
          durationSeconds: randomTest.duration_seconds ?? 3600,
          tags: randomTest.tags ?? [],
          isDailyChallenge: false,
          challengeDate: today,
        };
      }
    }

    // Check if user has attempted today's challenge
    if (dailyTest) {
      const { data: todayAttempt } = await supabase
        .from('reading_attempts')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('test_id', dailyTest.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1);

      hasAttemptedToday = !!(todayAttempt && todayAttempt.length > 0);
    }

    // Very simple streak calculation (can be replaced with your dedicated streak logic)
    const { data: attemptsRows } = await supabase
      .from('reading_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const uniqueDays = new Set(
      (attemptsRows || []).map((a) =>
        new Date(a.created_at as string).toISOString().split('T')[0],
      ),
    ).size;

    streakCurrent = Math.min(uniqueDays, 30);

    return {
      props: {
        dailyTest,
        hasAttemptedToday,
        streakCurrent,
      },
    };
  } catch (err) {
    console.error('[daily challenge] error:', err);
    return {
      props: {
        dailyTest: null,
        hasAttemptedToday: false,
        streakCurrent: 0,
        error:
          err instanceof Error ? err.message : 'Failed to load daily challenge',
      },
    };
  }
};

export default DailyChallengePage;
