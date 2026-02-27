// components/reading/ReadingForecastPanel.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { Skeleton } from '@/components/design-system/Skeleton';

type ForecastPayload = {
  bandNow: number;
  currentPct: number;
  targetBand: number;
  etaDays: number | null;
  confidence: 'low' | 'med' | 'high';
  rationale: string;
};

const ForecastSkeleton: React.FC = () => (
  <Card className="p-4 space-y-3 bg-background/95 dark:bg-dark/90">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-6 w-40" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <div className="pt-2">
      <Skeleton className="h-8 w-40 rounded-full" />
    </div>
  </Card>
);

export const ReadingForecastPanel: React.FC<{ targetBand?: number }> = ({
  targetBand = 7.0,
}) => {
  const [data, setData] = useState<ForecastPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setHasError(false);

        const r = await fetch(`/api/reading/forecast?target=${targetBand}`);
        if (!r.ok) {
          throw new Error(`forecast status ${r.status}`);
        }

        const j = (await r.json()) as Partial<ForecastPayload> | null;

        if (
          j &&
          typeof j.bandNow === 'number' &&
          typeof j.targetBand === 'number'
        ) {
          if (!cancelled) {
            setData({
              bandNow: j.bandNow,
              currentPct: j.currentPct ?? 0,
              targetBand: j.targetBand,
              etaDays: j.etaDays ?? null,
              confidence: (j.confidence as ForecastPayload['confidence']) ?? 'low',
              rationale:
                j.rationale ??
                'We need a few more completed mocks before the forecast becomes sharp.',
            });
          }
        } else {
          if (!cancelled) {
            setData(null);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Reading forecast fetch failed', e);
        if (!cancelled) {
          setHasError(true);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetBand]);

  if (loading) {
    return <ForecastSkeleton />;
  }

  if (!data) {
    return (
      <Card className="p-4 space-y-3 bg-background/95 dark:bg-dark/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.16em]">
            Reading forecast
          </span>
          <Badge variant="outline" className="rounded-ds-xl text-[10px]">
            <Icon name="Info" className="mr-1 h-3 w-3" />
            Warming up
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          We don&apos;t have enough completed reading attempts to forecast your band yet.
        </p>
        {hasError && (
          <p className="text-xs text-destructive">
            Couldn&apos;t reach the forecast service right now. Try again after another
            attempt.
          </p>
        )}
        <div className="pt-2">
          <Button
            variant="surface"
            size="sm"
            className="rounded-ds-xl text-xs"
            asChild
          >
            <a href="/mock/reading/history">Finish a mock to unlock forecast</a>
          </Button>
        </div>
      </Card>
    );
  }

  const bandNow = data.bandNow;
  const target = data.targetBand;

  const confidenceLabel =
    data.confidence === 'high'
      ? 'High confidence'
      : data.confidence === 'med'
      ? 'Medium confidence'
      : 'Early estimate';

  return (
    <Card className="p-4 space-y-3 bg-background/95 dark:bg-dark/90">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.16em]">
          Reading forecast
        </span>
        <Badge
          variant={data.confidence === 'high' ? 'success' : 'outline'}
          className="rounded-ds-xl text-[10px]"
        >
          <Icon name="Sparkles" className="mr-1 h-3 w-3" />
          {confidenceLabel}
        </Badge>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-foreground">
          {bandNow.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">
          → target {target.toFixed(1)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        Current:{' '}
        <span className="font-semibold text-foreground">
          Band {bandNow.toFixed(1)}
        </span>{' '}
        ({Math.round(data.currentPct)}% of target)
      </div>
      <div className="text-xs">
        {data.etaDays === null ? (
          <span className="text-muted-foreground">
            • Keep improving your slope to reach target.
          </span>
        ) : (
          <span className="font-semibold text-foreground">
            In ~{data.etaDays} days (based on your current pace)
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{data.rationale}</div>
      <div className="mt-3">
        <Button variant="surface" size="sm" className="rounded-ds-xl" asChild>
          <a href="/reading?type=tfng">Boost slope: weakest type drill</a>
        </Button>
      </div>
    </Card>
  );
};
