import React from 'react';

import { Card } from '@/components/design-system/Card';
import { Skeleton } from '@/components/design-system/Skeleton';
import type { WritingOverview } from '@/types/analytics';

type Props = {
  overview: WritingOverview | null;
  loading?: boolean;
};

const numberFormatter = new Intl.NumberFormat();
const bandFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = seconds / 60;
  if (minutes < 90) {
    return `${Math.round(minutes)} min`;
  }
  const hours = minutes / 60;
  const precision = hours >= 10 ? 0 : 1;
  return `${hours.toFixed(precision)} hr`;
}

export const WritingKPIs: React.FC<Props> = ({ overview, loading = false }) => {
  const totalAttempts = overview?.totalAttempts ?? 0;
  const totalWords = overview?.totalWords ?? 0;
  const averageBand = overview?.averageOverallBand ?? 0;
  const averageWordCount = overview?.averageWordCount ?? 0;
  const averageDuration = overview?.averageDurationSeconds ?? 0;
  const lastAttemptAt = overview?.lastAttemptAt ?? null;

  const lastAttemptLabel = React.useMemo(() => {
    if (!lastAttemptAt) return 'No attempts yet';
    try {
      const date = new Date(lastAttemptAt);
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return lastAttemptAt;
    }
  }, [lastAttemptAt]);

  const breakdown = React.useMemo(
    () => [
      { label: 'Task Response', value: overview?.averageTaskResponseBand ?? 0 },
      { label: 'Coherence & Cohesion', value: overview?.averageCoherenceBand ?? 0 },
      { label: 'Lexical Resource', value: overview?.averageLexicalBand ?? 0 },
      { label: 'Grammatical Range', value: overview?.averageGrammarBand ?? 0 },
    ],
    [
      overview?.averageTaskResponseBand,
      overview?.averageCoherenceBand,
      overview?.averageLexicalBand,
      overview?.averageGrammarBand,
    ],
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card padding="lg" className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Total Attempts</p>
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {numberFormatter.format(totalAttempts)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {loading ? <Skeleton className="mt-1 h-4 w-32" /> : `Total words ${numberFormatter.format(totalWords)}`}
          </p>
        </Card>

        <Card padding="lg" className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Average Overall Band</p>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {bandFormatter.format(averageBand)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {loading ? (
              <Skeleton className="mt-1 h-4 w-40" />
            ) : (
              <>
                Task response {bandFormatter.format(breakdown[0].value)} · Coherence {bandFormatter.format(breakdown[1].value)}
              </>
            )}
          </p>
        </Card>

        <Card padding="lg" className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Average Word Count</p>
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {numberFormatter.format(Math.max(0, averageWordCount || 0))}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {loading ? <Skeleton className="mt-1 h-4 w-36" /> : 'Per graded attempt'}
          </p>
        </Card>

        <Card padding="lg" className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Average Time Per Task</p>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {formatDuration(averageDuration)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {loading ? (
              <Skeleton className="mt-1 h-4 w-32" />
            ) : lastAttemptAt ? (
              `Last attempt ${lastAttemptLabel}`
            ) : (
              'No attempts yet'
            )}
          </p>
        </Card>
      </div>

      <Card padding="lg" insetBorder className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Criterion Breakdown</h3>
          <p className="text-sm text-muted-foreground">Average band scores across your selected window.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {breakdown.map((item) => (
            <div key={item.label} className="rounded-ds-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-2 text-2xl font-semibold text-foreground">{bandFormatter.format(item.value)}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-ds-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              `Your most recent attempt ${lastAttemptAt ? `was on ${lastAttemptLabel}` : 'has not been recorded yet.'}`
            )}
          </span>
          {!loading && lastAttemptAt && (
            <span className="text-xs uppercase tracking-wide text-foreground/70">
              {numberFormatter.format(totalAttempts)} attempts analysed
            </span>
          )}
        </div>
      </Card>
    </section>
  );
};

export default WritingKPIs;
