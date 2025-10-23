import * as React from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { BadgeStrip } from '@/components/challenge/BadgeStrip';
import { badges } from '@/data/badges';
import type { ChallengeLeaderboardEntry } from '@/types/challenge';

const MILESTONE_THRESHOLDS: Record<string, number> = {
  'lesson-1': 1,
  'lesson-10': 7,
  'lesson-100': 14,
};

const DEFAULT_TOTAL_TASKS = 14;

type ChallengeSpotlightCardProps = {
  cohortId: string;
  progress?: Record<string, 'pending' | 'done' | 'skipped'> | null;
};

export function ChallengeSpotlightCard({ cohortId, progress }: ChallengeSpotlightCardProps) {
  const [entries, setEntries] = React.useState<ChallengeLeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const snapshotDate = React.useMemo(() => entries[0]?.snapshotDate ?? null, [entries]);

  const completedTasks = React.useMemo(() => {
    if (!progress) return 0;
    return Object.values(progress).filter((status) => status === 'done').length;
  }, [progress]);

  const unlockedBadges = React.useMemo(() => {
    return badges.milestones
      .filter((badge) => completedTasks >= (MILESTONE_THRESHOLDS[badge.id] ?? Number.POSITIVE_INFINITY))
      .map((badge) => badge.id);
  }, [completedTasks]);

  const totalTasks = React.useMemo(() => {
    if (entries.length > 0 && entries[0].totalTasks) return entries[0].totalTasks;
    if (progress) {
      const daysTracked = Object.keys(progress).length;
      return Math.max(DEFAULT_TOTAL_TASKS, daysTracked || DEFAULT_TOTAL_TASKS);
    }
    return DEFAULT_TOTAL_TASKS;
  }, [entries, progress]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/challenge/leaderboard?cohort=${encodeURIComponent(cohortId)}`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const json = (await res.json()) as {
          ok: boolean;
          leaderboard?: ChallengeLeaderboardEntry[];
          error?: string;
        };
        if (!json.ok || !json.leaderboard) throw new Error(json.error || 'Unknown error');
        if (!cancelled) {
          setEntries(json.leaderboard.slice(0, 3));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load leaderboard.');
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [cohortId]);

  const progressPct = totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;

  return (
    <Card className="space-y-6 rounded-ds-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-slab text-h3 text-foreground">Weekly Challenge</h3>
          <p className="text-small text-muted-foreground">
            You&apos;re enrolled in <strong>{cohortId}</strong>. {completedTasks}/{totalTasks} tasks completed.
          </p>
        </div>
        <BadgeStrip badges={badges.milestones} unlocked={unlockedBadges} />
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
        <div className="flex items-center justify-between text-caption text-muted-foreground">
          <span>Progress toward finish line</span>
          <span>{progressPct}%</span>
        </div>
        <ProgressBar value={progressPct} ariaLabel="Challenge progress" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-small text-muted-foreground">
          <span>Leaderboard snapshot</span>
          {snapshotDate ? (
            <span className="text-caption">
              {new Date(snapshotDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void (async () => {
                setLoading(true);
                try {
                  const res = await fetch(`/api/challenge/leaderboard?cohort=${encodeURIComponent(cohortId)}`);
                  if (!res.ok) throw new Error('Failed');
                  const json = (await res.json()) as {
                    ok: boolean;
                    leaderboard?: ChallengeLeaderboardEntry[];
                    error?: string;
                  };
                  if (!json.ok || !json.leaderboard) throw new Error(json.error || 'Unknown error');
                  setEntries(json.leaderboard.slice(0, 3));
                  setError(null);
                } catch (err: any) {
                  setError(err?.message || 'Unable to refresh.');
                } finally {
                  setLoading(false);
                }
              })();
            }}
            className="rounded-lg border border-border bg-background px-2 py-1 text-caption hover:bg-border/30 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>
        <div className="space-y-2">
          {loading && !entries.length ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                <div className="h-4 w-20 animate-pulse rounded bg-border" />
                <div className="h-3 w-12 animate-pulse rounded bg-border" />
              </div>
            ))
          ) : entries.length ? (
            entries.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-caption font-semibold ${
                      entry.rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <span className="text-small font-medium text-foreground">{entry.fullName}</span>
                </div>
                <span className="text-caption text-muted-foreground">
                  {entry.completedTasks} tasks{typeof entry.xp === 'number' ? ` • ${entry.xp} XP` : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-caption text-muted-foreground">
              No leaderboard entries yet. Be the first to log progress!
            </div>
          )}
        </div>
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild className="rounded-xl">
          <Link href={`/challenge/${encodeURIComponent(cohortId)}`}>Open challenge</Link>
        </Button>
        <Button asChild variant="secondary" className="rounded-xl">
          <Link href="/leaderboard">View full leaderboard</Link>
        </Button>
      </div>
    </Card>
  );
}

export default ChallengeSpotlightCard;
