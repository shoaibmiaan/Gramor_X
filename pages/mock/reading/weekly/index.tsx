// pages/mock/reading/weekly/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';

import { getServerClient } from '@/lib/supabaseServer';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

type WeeklyTest = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  examType: string;
  totalQuestions: number;
  totalPassages: number;
  durationSeconds: number;
  tags: string[];
};

type PageProps = {
  test: WeeklyTest | null;
  hasAttempted: boolean;
  error?: string;
};

const WeeklyChallengePage: NextPage<PageProps> = ({ test, hasAttempted, error }) => {
  const router = useRouter();

  if (error) {
    return (
      <>
        <Head>
          <title>Weekly Challenge · Error</title>
        </Head>
        <Container className="py-10 max-w-4xl">
          <Card className="p-6 text-center space-y-4">
            <Icon name="alert-triangle" className="w-8 h-8 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Unable to load weekly challenge</h2>
            <p className="text-sm text-muted-foreground">{error}</p>

            <Button asChild>
              <Link href="/mock/reading">
                <Icon name="arrow-left" className="h-4 w-4 mr-2" /> Back to Reading
              </Link>
            </Button>
          </Card>
        </Container>
      </>
    );
  }

  const handleStart = () => {
    if (!test) return;
    router.push(`/mock/reading/${test.slug}?weekly=1`);
  };

  return (
    <>
      <Head>
        <title>Weekly Reading Challenge · GramorX</title>
      </Head>

      <Container className="py-10 max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Weekly Reading Challenge</h1>
            <p className="text-sm text-muted-foreground">
              One premium challenge every Sunday. 20 questions. Strict mode. Improve faster.
            </p>
          </div>

          <Badge variant="outline" className="rounded-ds-xl">
            <Icon name="calendar" className="h-4 w-4 mr-1" />
            Week {new Date().toLocaleDateString('en-US', { week: 'numeric', })}
          </Badge>
        </div>

        {/* Main */}
        {test ? (
          <Card className="p-6 space-y-6">
            <div className="space-y-3">
              <Badge variant="soft" className="rounded-ds text-xs uppercase">
                {test.examType === 'gt' ? 'General Training' : 'Academic'}
              </Badge>

              {test.difficulty && (
                <Badge variant="outline" className="rounded-ds text-xs">
                  {test.difficulty}
                </Badge>
              )}

              <h2 className="text-xl font-semibold">{test.title}</h2>
              {test.description && (
                <p className="text-sm text-muted-foreground">{test.description}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 border-y py-4 text-center">
              <div>
                <p className="text-lg font-semibold">{test.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{test.totalPassages}</p>
                <p className="text-xs text-muted-foreground">Passages</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{Math.round(test.durationSeconds / 60)}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
            </div>

            {/* Tags */}
            {test.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {test.tags.map((t) => (
                  <Badge key={t} variant="outline" className="rounded-ds text-xs px-2 py-1">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}

            <div className="pt-5">
              {hasAttempted ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/mock/reading/${test.slug}/review?weekly=1`}>
                    <Icon name="eye" className="mr-2 h-4 w-4" />
                    Review Your Attempt
                  </Link>
                </Button>
              ) : (
                <Button onClick={handleStart} className="w-full" size="lg">
                  <Icon name="play-circle" className="mr-2 h-5 w-5" />
                  Start Weekly Challenge
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-10 text-center space-y-4">
            <Icon name="calendar-off" className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No Weekly Challenge Available</h3>
            <p className="text-sm text-muted-foreground">
              This week’s challenge hasn’t been scheduled yet. Check again later.
            </p>

            <Button asChild>
              <Link href="/mock/reading">
                <Icon name="book-open" className="mr-2 h-4 w-4" />
                Go Back
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl),
          permanent: false,
        },
      };
    }

    const now = new Date();
    const week = Number(
      new Intl.DateTimeFormat('en-US', { week: 'numeric' }).format(now)
    );
    const year = now.getFullYear();

    // Try to load weekly challenge row
    const { data: row, error: weeklyError } = await supabase
      .from('reading_weekly_challenges')
      .select(
        `
        id,
        week_number,
        year,
        test_id,
        reading_tests (
          id, slug, title, description, exam_type, difficulty,
          total_questions, total_passages, duration_seconds, tags
        )
      `
      )
      .eq('week_number', week)
      .eq('year', year)
      .single();

    let test = null;

    if (row?.reading_tests) {
      const t = row.reading_tests as any;
      test = {
        id: t.id,
        slug: t.slug,
        title: t.title,
        description: t.description,
        examType: t.exam_type,
        difficulty: t.difficulty,
        totalQuestions: t.total_questions,
        totalPassages: t.total_passages,
        durationSeconds: t.duration_seconds,
        tags: t.tags ?? [],
      };
    } else {
      // fallback random
      const { data: random, error: randomError } = await supabase
        .from('reading_tests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!randomError && random) {
        test = {
          id: random.id,
          slug: random.slug,
          title: random.title,
          description: random.description,
          examType: random.exam_type,
          difficulty: random.difficulty,
          totalQuestions: random.total_questions ?? 40,
          totalPassages: random.total_passages ?? 3,
          durationSeconds: random.duration_seconds ?? 3600,
          tags: random.tags ?? [],
        };
      }
    }

    // Check if user attempted this challenge already
    let hasAttempted = false;
    if (test) {
      const { data: attempts } = await supabase
        .from('reading_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('test_id', test.id)
        .gte('created_at', `${year}-01-01`) // safe filter to avoid heavy scan
        .limit(1);

      hasAttempted = attempts && attempts.length > 0;
    }

    return {
      props: {
        test,
        hasAttempted,
      },
    };
  } catch (e) {
    return {
      props: {
        test: null,
        hasAttempted: false,
        error: 'Failed to load weekly challenge.',
      },
    };
  }
};

export default WeeklyChallengePage;
