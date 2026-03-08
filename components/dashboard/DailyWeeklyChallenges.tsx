import * as React from 'react';
import { DateTime } from 'luxon';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useChallenges } from '@/hooks/useChallenges';

const SCOPE_LABEL: Record<'daily' | 'weekly', string> = {
  daily: 'Daily Challenge',
  weekly: 'Weekly Challenge',
};

const TIME_ZONE = 'Asia/Karachi';

function formatReset(resetsAt: string | null): string {
  if (!resetsAt) return 'Resets soon';
  const now = DateTime.now().setZone(TIME_ZONE);
  const resetTime = DateTime.fromISO(resetsAt).setZone(TIME_ZONE);
  if (!resetTime.isValid) return 'Resets soon';
  const diff = resetTime.diff(now, ['days', 'hours']).toObject();
  if ((diff.days ?? 0) >= 1) {
    const days = Math.round(diff.days ?? 0);
    return `Resets in ${days} day${days === 1 ? '' : 's'}`;
  }
  const hours = Math.max(0, Math.round(diff.hours ?? 0));
  return `Resets in ${hours} hour${hours === 1 ? '' : 's'}`;
}

export function DailyWeeklyChallenges() {
  const {
    challenges,
    challengesError,
    progressError,
    isChallengesLoading,
    isChallengesValidating,
    updatingChallengeId,
    retryChallenges,
    updateProgress,
  } = useChallenges();
  const [xpFlash, setXpFlash] = React.useState<{ id: string; value: number } | null>(null);

  const error = challengesError || progressError;

  const increment = React.useCallback(
    async (challengeId: string) => {
      try {
        const result = await updateProgress(challengeId);
        if (result.xpAwarded) {
          setXpFlash({ id: challengeId, value: result.xpAwarded });
        }
      } catch {
        // Error state is managed by the hook.
      }
    },
    [updateProgress],
  );

  React.useEffect(() => {
    if (!xpFlash) return;
    const timer = setTimeout(() => {
      setXpFlash(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [xpFlash]);

  if (isChallengesLoading) {
    return (
      <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-ds-2xl border border-danger/40 bg-danger/5 p-6 text-danger">
        <h3 className="font-slab text-h5">{error}</h3>
        <p className="mt-2 text-small">Please refresh or try again later.</p>
        <Button
          variant="secondary"
          className="mt-4 rounded-ds-xl"
          onClick={() => void retryChallenges()}
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (!challenges.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {challenges.map((challenge) => {
        const progress = challenge.progress;
        const completed = progress?.progressCount ?? 0;
        const target = progress?.target ?? challenge.goal;
        const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
        const busy = updatingChallengeId === challenge.id;
        const flash = xpFlash?.id === challenge.id ? xpFlash.value : null;

        return (
          <Card
            key={challenge.id}
            className="rounded-ds-2xl border border-border/60 bg-card/70 p-6"
          >
            <div className="flex items-center justify-between">
              <Badge variant="secondary" size="sm">
                {SCOPE_LABEL[challenge.type]}
              </Badge>
              <span className="text-caption text-muted-foreground">
                {formatReset(progress?.resetsAt ?? null)}
              </span>
            </div>
            <h3 className="mt-3 font-slab text-h4 text-foreground">{challenge.title}</h3>
            <p className="mt-2 text-small text-muted-foreground">{challenge.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              <span>
                Progress {completed}/{target}
              </span>
              <span className="hidden md:inline">•</span>
              <span>Total mastered: {progress?.totalMastered ?? 0}</span>
              <span className="hidden md:inline">•</span>
              <span>XP +{challenge.xpReward}</span>
              {flash ? (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  +{flash} XP!
                </span>
              ) : null}
            </div>

            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border/40"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={target}
              aria-valuenow={completed}
            >
              <svg className="h-full w-full" aria-hidden focusable="false">
                <rect
                  width={`${pct}%`}
                  height="100%"
                  fill="currentColor"
                  className="text-primary"
                  rx="9999"
                />
              </svg>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                className="rounded-ds-xl"
                onClick={() => void increment(challenge.id)}
                disabled={busy || completed >= target}
              >
                {busy ? 'Saving…' : completed >= target ? 'Completed' : 'Log collocation'}
              </Button>
              <Button
                variant="secondary"
                className="rounded-ds-xl"
                onClick={() => void retryChallenges()}
                disabled={busy || isChallengesValidating}
              >
                {isChallengesValidating ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default DailyWeeklyChallenges;
