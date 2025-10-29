import React, { useCallback, useMemo, useState } from 'react';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { cx } from '@/components/design-system/_core/types';
import type { NextTaskEvidence, NextTaskPayload } from '@/hooks/useNextTask';

const MODULE_BADGES: Record<NextTaskPayload['module'], { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  speaking: { label: 'Speaking', variant: 'primary' },
  reading: { label: 'Reading', variant: 'info' },
  writing: { label: 'Writing', variant: 'accent' },
  listening: { label: 'Listening', variant: 'success' },
  vocab: { label: 'Vocabulary', variant: 'secondary' },
};

type NextTaskCardProps = {
  className?: string;
  loading: boolean;
  task: NextTaskPayload | null;
  reason: string | null;
  evidence: NextTaskEvidence[];
  recommendationId: string | null;
  score: number | null;
  error: Error | null;
  onRefresh?: () => void | Promise<void>;
  variant?: 'default' | 'compact';
};

function formatMinutes(minutes: number) {
  if (minutes <= 1) return '1 minute';
  return `${minutes} minutes`;
}

export function NextTaskCard({
  className,
  loading,
  task,
  reason,
  evidence,
  recommendationId,
  score,
  error,
  onRefresh,
  variant = 'default',
}: NextTaskCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const moduleMeta = task ? MODULE_BADGES[task.module] : null;

  const heading = useMemo(() => {
    if (task?.title) return task.title;
    if (!task) return 'Next best action';
    return task.slug.replace(/[-_]/g, ' ');
  }, [task]);

  const summary = useMemo(() => {
    if (task?.summary) return task.summary;
    if (!task) return null;
    switch (task.module) {
      case 'speaking':
        return 'Sharpen pronunciation and fluency with a targeted drill.';
      case 'reading':
        return 'Strengthen comprehension strategies with a quick focused set.';
      case 'writing':
        return 'Build structure, coherence, and lexical range in under 20 minutes.';
      case 'listening':
        return 'Tighten accuracy with a short active listening practice.';
      case 'vocab':
        return 'Expand lexical range with high-yield collocations.';
      default:
        return null;
    }
  }, [task]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleStart = useCallback(async () => {
    if (!task) return;
    const destination = task.deeplink || '/learning';

    if (!recommendationId) {
      if (typeof window !== 'undefined') {
        window.location.assign(destination);
      }
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch('/api/reco/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; deeplink?: string };
        if (typeof window !== 'undefined') {
          window.location.assign(data?.deeplink || destination);
        }
        return;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NextTaskCard] accept failed', err);
    } finally {
      setAccepting(false);
    }

    if (typeof window !== 'undefined') {
      window.location.assign(destination);
    }
  }, [task, recommendationId]);

  const shellClasses = cx(
    'flex flex-col gap-4',
    variant === 'compact' ? 'p-4 sm:p-5' : 'p-6 sm:p-8',
    className,
  );

  if (loading && !task) {
    return (
      <Card className={shellClasses}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-border/70" />
          <div className="h-4 w-16 animate-pulse rounded bg-border/70" />
        </div>
        <div className="h-6 w-48 animate-pulse rounded bg-border/70" />
        <div className="h-24 w-full animate-pulse rounded bg-border/70" />
        <div className="flex gap-3">
          <div className="h-10 w-32 animate-pulse rounded bg-border/70" />
          <div className="h-10 w-32 animate-pulse rounded bg-border/70" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={shellClasses}>
        <div className="flex flex-col gap-3">
          <div className="text-h4 font-semibold">Adaptive recommendation unavailable</div>
          <p className="text-body text-muted-foreground">
            We couldn’t load your next task right now. Try refreshing or come back later.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleRefresh} loading={refreshing} className="rounded-ds-xl">
              Refresh
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className={shellClasses}>
        <div className="flex flex-col gap-3">
          <div className="text-h4 font-semibold">Get a recommendation</div>
          <p className="text-body text-muted-foreground">
            Complete a speaking, reading, or writing attempt to unlock a personalised next step.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleRefresh} loading={refreshing} className="rounded-ds-xl">
              Check again
            </Button>
            <Button variant="ghost" href="/learning" className="rounded-ds-xl">
              Explore practice hub
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={shellClasses}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {moduleMeta ? <Badge variant={moduleMeta.variant}>{moduleMeta.label}</Badge> : null}
            <Badge variant="neutral">{task.type.toUpperCase()}</Badge>
            <Badge variant="subtle">{formatMinutes(task.estMinutes)}</Badge>
          </div>
          {task.minPlan !== 'free' && (
            <Badge variant="warning">{task.minPlan.charAt(0).toUpperCase() + task.minPlan.slice(1)} plan</Badge>
          )}
        </div>
        <div>
          <h3 className="font-slab text-h3 leading-tight">{heading}</h3>
          {summary ? <p className="mt-2 text-body text-muted-foreground">{summary}</p> : null}
        </div>
        {reason ? <p className="text-small text-muted-foreground/90">{reason}</p> : null}
        {evidence.length ? (
          <ul className="mt-2 space-y-1 text-small text-muted-foreground/90">
            {evidence.slice(0, 3).map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  <strong className="text-foreground">{item.headline}</strong>
                  {item.detail ? <span className="text-muted-foreground"> — {item.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={handleStart} loading={accepting} className="rounded-ds-xl">
          Start now
        </Button>
        <Button variant="secondary" onClick={handleRefresh} loading={refreshing} className="rounded-ds-xl">
          New suggestion
        </Button>
      </div>
      {typeof score === 'number' ? (
        <div className="text-caption text-muted-foreground/80">
          Confidence score {Math.max(0, Math.min(100, Math.round(score * 25 + 60)))}%
        </div>
      ) : null}
    </Card>
  );
}

export default NextTaskCard;
