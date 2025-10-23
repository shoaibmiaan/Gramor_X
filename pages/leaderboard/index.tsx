import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Skeleton } from '@/components/design-system/Skeleton';
import LeaderboardFilters, { type LeaderboardScope, type LeaderboardSkill } from '@/components/leaderboard/LeaderboardFilters';
import { track } from '@/lib/analytics/track';

interface Entry {
  userId: string;
  fullName: string;
  xp: number;
  rank: number;
  snapshotDate: string | null;
}

const SCOPE_LABEL: Record<LeaderboardScope, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
};

const SCOPE_DESCRIPTION: Record<LeaderboardScope, string> = {
  daily: 'Daily snapshots reset at midnight Karachi time.',
  weekly: 'Weekly snapshots reset every Monday.',
};

function formatSnapshot(entries: Entry[]): string | null {
  const snapshot = entries[0]?.snapshotDate;
  return snapshot ?? null;
}

export default function XpLeaderboard() {
  const [entries, setEntries] = useState<Record<LeaderboardScope, Entry[]>>({ daily: [], weekly: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeScope, setActiveScope] = useState<LeaderboardScope>('weekly');
  const [skill, setSkill] = useState<LeaderboardSkill>('xp');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/leaderboard/xp');
        if (!res.ok) {
          throw new Error('Unable to load leaderboard');
        }
        const json = (await res.json()) as {
          ok: boolean;
          entries?: Record<LeaderboardScope, Array<{ userId: string; fullName: string; xp: number; rank: number; snapshotDate: string }>>;
          error?: string;
        };
        if (!json.ok || !json.entries) {
          throw new Error(json.error || 'Unable to load leaderboard');
        }
        if (!cancelled) {
          const normalized: Record<LeaderboardScope, Entry[]> = {
            daily: (json.entries.daily ?? []).map((row) => ({
              userId: row.userId,
              fullName: row.fullName ?? 'Anonymous',
              xp: row.xp ?? 0,
              rank: row.rank ?? 0,
              snapshotDate: row.snapshotDate ?? null,
            })),
            weekly: (json.entries.weekly ?? []).map((row) => ({
              userId: row.userId,
              fullName: row.fullName ?? 'Anonymous',
              xp: row.xp ?? 0,
              rank: row.rank ?? 0,
              snapshotDate: row.snapshotDate ?? null,
            })),
          };
          setEntries(normalized);
        }
      } catch (err) {
        console.error('[leaderboard] failed to load leaderboard', err);
        if (!cancelled) setError('Unable to load the leaderboard right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentEntries = useMemo(() => {
    if (skill === 'writing') return [];
    return entries[activeScope] ?? [];
  }, [entries, activeScope, skill]);

  const { topThree, rest } = useMemo(() => {
    return {
      topThree: currentEntries.slice(0, 3),
      rest: currentEntries.slice(3),
    };
  }, [currentEntries]);

  const snapshotDate = formatSnapshot(currentEntries);

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
        {skill === 'writing' ? 'Writing' : `${SCOPE_LABEL[activeScope]} Challenge`}
      </Badge>
      <h2 className="font-slab text-h2 mt-4">No scores… yet!</h2>
      <p className="text-body mt-3 text-grayish">
        {skill === 'writing'
          ? 'Complete a mock writing attempt to populate the writing leaderboard.'
          : `Be the first to complete this ${activeScope === 'daily' ? "day's" : "week's"} tasks and claim the top spot on the leaderboard.`}
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
    </Card>
  );

  useEffect(() => {
    if (skill === 'writing') {
      track('leaderboard.view.writing', { scope: activeScope });
    }
  }, [activeScope, skill]);

  return (
    <>
      <Head>
        <title>XP Leaderboard · GramorX</title>
        <meta
          name="description"
          content="See how you rank in daily and weekly IELTS practice challenges and compete with other learners."
        />
      </Head>

      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="accent" size="sm" className="uppercase tracking-wide">
              Gamification
            </Badge>
            <h1 className="font-slab text-display mt-4 text-foreground">XP Leaderboard</h1>
            <p className="mt-3 text-body text-grayish">
              Earn XP from lessons, drills, writing minis, and speaking attempts. Climb the daily and weekly boards as you stay consistent.
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

            <div className="mt-8">
              <LeaderboardFilters
                scope={activeScope}
                skill={skill}
                onScopeChange={setActiveScope}
                onSkillChange={setSkill}
              />
            </div>
            <p className="mt-3 text-caption text-muted-foreground">
              {SCOPE_DESCRIPTION[activeScope]}
              {snapshotDate ? ` • Snapshot ${snapshotDate}` : ''}
            </p>
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

            {!loading && !error && currentEntries.length === 0 && renderEmptyState()}

            {!loading && !error && currentEntries.length > 0 && (
              <>
                <Card className="relative overflow-hidden rounded-ds-2xl border border-primary/10 bg-background/80 p-8">
                  <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                  <div className="relative z-10">
                    <h2 className="font-slab text-h2 text-foreground">Top performers ({SCOPE_LABEL[activeScope]})</h2>
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
                            key={entry.userId}
                            className={`rounded-ds-xl border p-5 text-left transition-transform hover:-translate-y-1 ${classes}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl" aria-hidden>
                                {medal}
                              </span>
                              <div>
                                <p className="text-caption uppercase tracking-wide text-grayish">Rank {entry.rank}</p>
                                <p className="text-body font-semibold text-foreground">{entry.fullName}</p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <p className="text-caption text-grayish">Challenge XP</p>
                              <p className="text-h3 font-slab text-foreground">{entry.xp}</p>
                            </div>
                          </div>
                        );
                      })}
                      {topThree.length < 3 &&
                        [...Array(3 - topThree.length)].map((_, i) => (
                          <div
                            key={`placeholder-${i}`}
                            className="rounded-ds-xl border border-dashed border-border/60 p-5 text-center text-caption text-muted-foreground"
                          >
                            Spot available
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-ds-2xl border border-border/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-slab text-h4 text-foreground">Leaderboard</h3>
                    <Badge variant="secondary" size="sm">
                      Showing top {currentEntries.length} learners
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {rest.map((entry) => (
                      <div
                        key={entry.userId}
                        className="flex items-center justify-between gap-4 rounded-ds-xl border border-border/60 bg-background/80 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-caption font-semibold text-foreground">
                            {entry.rank}
                          </span>
                          <div>
                            <p className="text-small font-medium text-foreground">{entry.fullName}</p>
                            <p className="text-caption text-muted-foreground">XP {entry.xp}</p>
                          </div>
                        </div>
                        <span className="text-caption text-muted-foreground">Rank {entry.rank}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
