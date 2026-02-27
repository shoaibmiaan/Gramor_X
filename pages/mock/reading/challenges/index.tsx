// pages/mock/reading/challenges/index.tsx
import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { getServerClient } from '@/lib/supabaseServer';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { computeDailyStreak } from '@/lib/reading/streak';

type ChallengeHubProps = {
  streakCurrent: number;
};

const ReadingChallengeHubPage: NextPage<ChallengeHubProps> = ({ streakCurrent }) => {
  return (
    <>
      <Head>
        <title>Reading Challenge Hub · GramorX</title>
      </Head>

      <Container className="py-8 space-y-8">
        {/* Header / Hero */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge size="xs" variant="outline">
              Reading · Challenges
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">
              Reading Challenge Hub
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Not just full mocks. Mix in speed runs, accuracy drills, question-type
              practice and weekly boss fights so Reading never feels boring.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="subtle" className="rounded-ds-xl">
                <Icon name="zap" className="mr-1 h-3 w-3" />
                Game-style practice
              </Badge>
              <Badge variant="outline" className="rounded-ds-xl">
                Uses your existing Reading engine
              </Badge>
              {streakCurrent > 0 && (
                <Badge
                  variant="subtle"
                  className="rounded-ds-xl flex items-center gap-1"
                >
                  <Icon name="flame" className="h-3 w-3" />
                  {streakCurrent}-day streak in Reading
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/mock/reading">
                <Icon name="book-open" className="mr-2 h-4 w-4" />
                Back to Reading mocks
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/mock/reading/daily">
                <Icon name="play-circle" className="mr-2 h-4 w-4" />
                Jump to today&apos;s challenge
              </Link>
            </Button>
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. Daily Challenge */}
          <Card className="flex flex-col p-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-ds text-[10px] uppercase">
                  Live now
                </Badge>
                <Badge variant="subtle" className="rounded-ds text-[10px]">
                  40 Q · Full test
                </Badge>
              </div>
              <h2 className="text-sm font-semibold">Daily Reading Challenge</h2>
              <p className="text-xs text-muted-foreground">
                One seed-based Reading test per day. Strict timer, band tracking,
                perfect for anchoring your daily routine.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button asChild size="sm" className="flex-1 rounded-ds-xl text-xs">
                <Link href="/mock/reading/daily">
                  <Icon name="play" className="mr-2 h-4 w-4" />
                  Start today&apos;s challenge
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="icon"
                className="rounded-ds"
                aria-label="View daily challenge history"
              >
                <Link href="/mock/reading/history?mode=daily">
                  <Icon name="history" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>

          {/* 2. Speed Challenge */}
          <Card className="flex flex-col p-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-ds text-[10px] uppercase">
                  New
                </Badge>
                <Badge variant="subtle" className="rounded-ds text-[10px]">
                  3 min · 5 Q
                </Badge>
              </div>
              <h2 className="text-sm font-semibold">Speed Challenge</h2>
              <p className="text-xs text-muted-foreground">
                3-minute micro tests to train quick scanning and skimming. Perfect
                when you&apos;ve only got a few minutes.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                asChild
                size="sm"
                className="flex-1 rounded-ds-xl text-xs"
              >
                <Link href="/mock/reading/challenges/speed">
                  <Icon name="zap" className="mr-2 h-4 w-4" />
                  Start speed run
                </Link>
              </Button>
              <Badge variant="outline" className="text-[10px] rounded-ds">
                Arcade mode
              </Badge>
            </div>
          </Card>

          {/* 3. Accuracy Drill */}
          <Card className="flex flex-col p-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-ds text-[10px] uppercase">
                  Focus
                </Badge>
                <Badge variant="subtle" className="rounded-ds text-[10px]">
                  10 Q · 90% target
                </Badge>
              </div>
              <h2 className="text-sm font-semibold">Accuracy Drill (90% Mode)</h2>
              <p className="text-xs text-muted-foreground">
                Short, high-focus sets. Hit 90%+ to clear the drill. Designed to
                punish guess work and reward careful reading.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                asChild
                size="sm"
                className="flex-1 rounded-ds-xl text-xs"
              >
                <Link href="/mock/reading/challenges/accuracy">
                  <Icon name="target" className="mr-2 h-4 w-4" />
                  Start accuracy drill
                </Link>
              </Button>
              <Badge variant="outline" className="text-[10px] rounded-ds">
                High stakes
              </Badge>
            </div>
          </Card>

          {/* 4. Question-Type Mastery */}
          <Card className="flex flex-col p-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-ds text-[10px] uppercase">
                  Mastery
                </Badge>
                <Badge variant="subtle" className="rounded-ds text-[10px]">
                  Type-based
                </Badge>
              </div>
              <h2 className="text-sm font-semibold">Question-Type Mastery</h2>
              <p className="text-xs text-muted-foreground">
                Pick a question type – TF/NG, headings, matching, summary completion –
                and grind only that until it feels easy.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                asChild
                size="sm"
                className="flex-1 rounded-ds-xl text-xs"
              >
                <Link href="/mock/reading/challenges/mastery">
                  <Icon name="layers" className="mr-2 h-4 w-4" />
                  Choose question type
                </Link>
              </Button>
              <Badge variant="outline" className="text-[10px] rounded-ds">
                Weakness killer
              </Badge>
            </div>
          </Card>

          {/* 5. Weekly Boss Challenge */}
          <Card className="flex flex-col p-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-ds text-[10px] uppercase">
                  Weekly
                </Badge>
                <Badge variant="subtle" className="rounded-ds text-[10px]">
                  20 Q · Event
                </Badge>
              </div>
              <h2 className="text-sm font-semibold">Weekly Boss Challenge</h2>
              <p className="text-xs text-muted-foreground">
                Once-per-week curated challenge to test everything you&apos;ve been
                grinding. Ideal for tracking real improvement.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                asChild
                size="sm"
                className="flex-1 rounded-ds-xl text-xs"
              >
                <Link href="/mock/reading/challenges/weekly">
                  <Icon name="calendar" className="mr-2 h-4 w-4" />
                  Enter this week&apos;s boss
                </Link>
              </Button>
              <Badge variant="outline" className="text-[10px] rounded-ds">
                Leaderboard-friendly
              </Badge>
            </div>
          </Card>

          {/* 6. History & Analytics */}
          <Card className="flex flex-col p-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="rounded-ds text-[10px] uppercase">
                  Insights
                </Badge>
                <Badge variant="subtle" className="rounded-ds text-[10px]">
                  All modes
                </Badge>
              </div>
              <h2 className="text-sm font-semibold">Challenge History & Analytics</h2>
              <p className="text-xs text-muted-foreground">
                Review all your challenge attempts, see band deltas and spot which
                modes actually push your Reading score up.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                asChild
                size="sm"
                className="flex-1 rounded-ds-xl text-xs"
              >
                <Link href="/mock/reading/analytics">
                  <Icon name="activity" className="mr-2 h-4 w-4" />
                  Open Reading analytics
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="rounded-ds-xl text-[11px]"
              >
                <Link href="/mock/reading/history">
                  <Icon name="clock" className="mr-1 h-3 w-3" />
                  View all attempts
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<ChallengeHubProps> = async (
  ctx,
) => {
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
            '/login?redirect=' +
            encodeURIComponent(ctx.resolvedUrl ?? '/mock/reading/challenges'),
          permanent: false,
        },
      };
    }

    let streakCurrent = 0;

    const { data: attemptsRows, error: attemptsError } = await supabase
      .from('reading_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(90);

    if (!attemptsError && attemptsRows) {
      const { currentStreak } = computeDailyStreak(
        attemptsRows.map((a) => ({ date: a.created_at as string })),
      );
      streakCurrent = currentStreak;
    }

    return {
      props: {
        streakCurrent,
      },
    };
  } catch (err) {
    // fallback: still show hub, just no streak
    // eslint-disable-next-line no-console
    console.error('[reading challenge hub] error:', err);
    return {
      props: {
        streakCurrent: 0,
      },
    };
  }
};

export default ReadingChallengeHubPage;
