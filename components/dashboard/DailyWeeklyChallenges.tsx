import * as React from 'react';
import { DateTime } from 'luxon';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Skeleton } from '@/components/design-system/Skeleton';
import { authHeaders } from '@/lib/supabaseBrowser';
import type { ChallengeDefinition } from '@/pages/api/gamification/challenges';

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

type ChallengeItem = ChallengeDefinition;

type State = {
  loading: boolean;
  error: string | null;
  challenges: ChallengeItem[];
  busyId: string | null;
  xpFlash?: { id: string; value: number } | null;
};

export function DailyWeeklyChallenges() {
  const [state, setState] = React.useState<State>({
    loading: true,
    error: null,
    challenges: [],
    busyId: null,
  });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/gamification/challenges', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        throw new Error('Unable to load challenges');
      }
      const json = (await res.json()) as { ok: boolean; challenges?: ChallengeItem[]; error?: string };
      if (!json.ok || !json.challenges) {
        throw new Error(json.error || 'Unable to load challenges');
      }
      setState((s) => ({ ...s, loading: false, challenges: json.challenges }));
    } catch (error: any) {
      setState((s) => ({ ...s, loading: false, error: error?.message || 'Failed to load challenges' }));
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const increment = React.useCallback(
    async (challengeId: string) => {
      setState((s) => ({ ...s, busyId: challengeId, error: null }));
      try {
        const res = await fetch('/api/gamification/challenges/progress', {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ challengeId }),
        });
        const json = (await res.json().catch(() => null)) as
          | {
              ok: boolean;
              xpAwarded?: number;
              progress?: {
                challengeId: string;
                progressCount: number;
                totalMastered: number;
                target: number;
                lastIncrementedAt: string | null;
                resetsAt: string | null;
              };
              error?: string;
            }
          | null;
        if (!res.ok || !json || !json.ok || !json.progress) {
          throw new Error(json?.error || 'Failed to update progress');
        }
        setState((s) => ({
          ...s,
          busyId: null,
          xpFlash: json.xpAwarded ? { id: challengeId, value: json.xpAwarded } : null,
          challenges: s.challenges.map((challenge) =>
            challenge.id === challengeId
              ? {
                  ...challenge,
                  progress: {
                    challengeId,
                    progressCount: json.progress?.progressCount ?? 0,
                    totalMastered: json.progress?.totalMastered ?? 0,
                    target: json.progress?.target ?? challenge.goal,
                    lastIncrementedAt: json.progress?.lastIncrementedAt ?? null,
                    resetsAt: json.progress?.resetsAt ?? null,
                  },
                }
              : challenge,
          ),
        }));
      } catch (error: any) {
        setState((s) => ({ ...s, busyId: null, error: error?.message || 'Failed to update challenge' }));
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!state.xpFlash) return;
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, xpFlash: null }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.xpFlash]);

  if (state.loading) {
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

  if (state.error) {
    return (
      <Card className="rounded-ds-2xl border border-danger/40 bg-danger/5 p-6 text-danger">
        <h3 className="font-slab text-h5">{state.error}</h3>
        <p className="mt-2 text-small">Please refresh or try again later.</p>
        <Button variant="secondary" className="mt-4 rounded-ds-xl" onClick={() => void load()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!state.challenges.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {state.challenges.map((challenge) => {
        const progress = challenge.progress;
        const completed = progress?.progressCount ?? 0;
        const target = progress?.target ?? challenge.goal;
        const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
        const busy = state.busyId === challenge.id;
        const xpFlash = state.xpFlash?.id === challenge.id ? state.xpFlash.value : null;
        return (
          <Card key={challenge.id} className="rounded-ds-2xl border border-border/60 bg-card/70 p-6">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" size="sm">
                {SCOPE_LABEL[challenge.type]}
              </Badge>
              <span className="text-caption text-muted-foreground">{formatReset(progress?.resetsAt ?? null)}</span>
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
              {xpFlash ? (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  +{xpFlash} XP!
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
                <rect width={`${pct}%`} height="100%" fill="currentColor" className="text-primary" rx="9999" />
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
              <Button variant="secondary" className="rounded-ds-xl" onClick={() => void load()} disabled={busy}>
                Refresh
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default DailyWeeklyChallenges;
