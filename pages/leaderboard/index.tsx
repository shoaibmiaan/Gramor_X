import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Skeleton } from '@/components/design-system/Skeleton';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

interface Entry {
  user_id: string;
  full_name: string | null;
  score: number;
}

export default function WeeklyLeaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_leaderboard')
          .select('user_id, score, profiles(full_name)')
          .order('score', { ascending: false })
          .limit(10);

        if (error) {
          throw error;
        }

        if (data) {
          const formatted: Entry[] = data.map((d: any) => ({
            user_id: d.user_id,
            score: d.score,
            full_name: d.profiles?.full_name ?? 'Anonymous',
          }));
          setEntries(formatted);
        }
      } catch (err) {
        console.error('[leaderboard] failed to load leaderboard', err);
        setError('Unable to load the leaderboard right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { topThree, rest } = useMemo(() => {
    return {
      topThree: entries.slice(0, 3),
      rest: entries.slice(3),
    };
  }, [entries]);

  const renderLoadingState = () => (
    <Card className="p-8 rounded-ds-2xl">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-ds-xl border border-muted/40 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-4 h-4 w-32" />
            <Skeleton className="mt-2 h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </Card>
  );

  const renderEmptyState = () => (
    <Card className="p-8 text-center rounded-ds-2xl">
      <Badge variant="secondary" size="sm" className="mx-auto">
        Weekly Challenge
      </Badge>
      <h2 className="font-slab text-h2 mt-4">No scores… yet!</h2>
      <p className="text-body mt-3 text-grayish">
        Be the first to complete this week&rsquo;s tasks and claim the top spot on the leaderboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/challenge">
          <Button variant="primary" className="rounded-ds-xl">
            Join the weekly challenge
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary" className="rounded-ds-xl">
            Back to dashboard
          </Button>
        </Link>
      </div>
    </Card>
  );

  return (
    <>
      <Head>
        <title>Weekly Leaderboard · GramorX</title>
        <meta
          name="description"
          content="See how you rank in this week&rsquo;s IELTS practice challenge and compete with other learners."
        />
      </Head>

      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="accent" size="sm" className="uppercase tracking-wide">
              Weekly Challenge
            </Badge>
            <h1 className="font-slab text-display mt-4 text-foreground">Weekly Leaderboard</h1>
            <p className="mt-3 text-body text-grayish">
              Complete daily micro-tasks to earn points, unlock badges, and climb to the top. Scores reset every
              Monday.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/challenge">
                <Button variant="primary" className="rounded-ds-xl">
                  Join the challenge
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" className="rounded-ds-xl">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-12 max-w-4xl mx-auto space-y-8">
            {loading && renderLoadingState()}

            {!loading && error && (
              <Card className="p-8 rounded-ds-2xl text-center">
                <h2 className="font-slab text-h3">{error}</h2>
                <p className="mt-3 text-body text-grayish">
                  Please refresh the page in a moment or explore other practice areas while we fix it.
                </p>
              </Card>
            )}

            {!loading && !error && entries.length === 0 && renderEmptyState()}

            {!loading && !error && entries.length > 0 && (
              <>
                <Card className="relative overflow-hidden rounded-ds-2xl border border-primary/10 bg-background/80 p-8">
                  <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                  <div className="relative z-10">
                    <h2 className="font-slab text-h2 text-foreground">This Week&rsquo;s Top Performers</h2>
                    <p className="mt-2 text-body text-grayish">
                      Keep your streak alive and collect challenge points through lessons, drills, and mock tests.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      {topThree.map((entry, index) => {
                        const medal = ['🥇', '🥈', '🥉'][index];
                        const classes =
                          index === 0
                            ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10'
                            : 'bg-muted/40 border-muted/60';

                        return (
                          <div
                            key={entry.user_id}
                            className={`rounded-ds-xl border p-5 text-left transition-transform hover:-translate-y-1 ${classes}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl" aria-hidden>
                                {medal}
                              </span>
                              <div>
                                <p className="text-caption uppercase tracking-wide text-grayish">Rank {index + 1}</p>
                                <p className="text-body font-semibold text-foreground">{entry.full_name}</p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <p className="text-caption text-grayish">Challenge points</p>
                              <p className="text-h3 font-slab text-foreground">{entry.score}</p>
                            </div>
                          </div>
                        );
                      })}
                      {topThree.length < 3 &&
                        [...Array(3 - topThree.length)].map((_, i) => (
                          <div
                            key={`placeholder-${i}`}
                            className="rounded-ds-xl border border-dashed border-muted/60 bg-muted/20 p-5 text-left"
                          >
                            <p className="text-body font-semibold text-grayish">Reserved for you</p>
                            <p className="mt-2 text-caption text-grayish opacity-80">
                              Finish more tasks to appear in the top {3 - i}.
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>

                {rest.length > 0 && (
                  <Card className="rounded-ds-2xl border border-border/40 bg-background/80 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-slab text-h3 text-foreground">Challengers on your heels</h3>
                      <span className="text-small text-grayish">Positions 4–{entries.length}</span>
                    </div>
                    <ol className="mt-6 space-y-3">
                      {rest.map((entry, index) => (
                        <li
                          key={entry.user_id}
                          className="flex items-center justify-between rounded-ds-lg border border-transparent bg-muted/20 px-4 py-3 transition hover:border-primary/30 hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-caption font-semibold text-grayish">#{index + 4}</span>
                            <span className="text-body font-medium text-foreground">{entry.full_name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{entry.score}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
