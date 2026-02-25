import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Select } from '@/components/design-system/Select';
import { Skeleton } from '@/components/design-system/Skeleton';
import WritingKPIs from '@/components/analytics/WritingKPIs';
import WritingWeeklyTrend from '@/components/analytics/WritingWeeklyTrend';
import { logWritingAnalyticsView, logWritingAnalyticsTrendChange } from '@/lib/analytics/writing-events';
import type { WritingOverview, WeeklySeries } from '@/types/analytics';

type ApiSuccess = {
  ok: true;
  generatedAt: string;
  overview: WritingOverview;
  weekly: WeeklySeries;
  cached?: boolean;
};

type ApiError = { ok: false; error: string };

type ApiResponse = ApiSuccess | ApiError;

const WEEK_OPTIONS = [
  { value: 4, label: 'Last 4 weeks' },
  { value: 8, label: 'Last 8 weeks' },
  { value: 12, label: 'Last 12 weeks' },
  { value: 24, label: 'Last 24 weeks' },
];

const DEFAULT_WEEKS = 8;

export default function WritingAnalyticsPage() {
  const [weeks, setWeeks] = useState<number>(DEFAULT_WEEKS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiSuccess | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ weeks: String(weeks) });
        const res = await fetch(`/api/analytics/writing/overview?${params}`, {
          signal: controller.signal,
        });
        const json: ApiResponse = await res.json();
        if (controller.signal.aborted) return;
        if (json.ok) {
          setData(json);
        } else {
          setError(json.error || 'Unable to load analytics');
          setData(null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Unable to load analytics');
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [weeks]);

  useEffect(() => {
    if (!loading && data) {
      logWritingAnalyticsView({
        source: 'load',
        weeks,
        attempts: data.overview.totalAttempts,
        cached: data.cached,
      });
    }
  }, [loading, data, weeks]);

  const generatedLabel = useMemo(() => {
    if (!data) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.generatedAt));
    } catch {
      return data.generatedAt;
    }
  }, [data]);

  const handleWeeksChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setWeeks(value);
    logWritingAnalyticsTrendChange({ weeks: value, source: 'filter' });
  };

  return (
    <>
      <Head>
        <title>Writing Analytics · GramorX</title>
      </Head>
      <main className="min-h-screen bg-background">
        <section className="border-b border-border bg-background/80 backdrop-blur">
          <Container className="py-10">
            <div className="space-y-2">
              <h1 className="font-slab text-3xl text-foreground md:text-4xl">Writing Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Review how your IELTS writing practice is trending and where to focus next.
              </p>
            </div>
          </Container>
        </section>

        <Container className="py-8 space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:w-auto">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time window</p>
              <Select
                size="sm"
                variant="solid"
                value={String(weeks)}
                onChange={handleWeeksChange}
                className="mt-1 w-full md:w-48"
                options={WEEK_OPTIONS.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
              />
            </div>
            <div className="text-xs text-muted-foreground md:text-right">
              {loading ? (
                <Skeleton className="h-4 w-28" />
              ) : generatedLabel ? (
                <>Generated {generatedLabel}</>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-ds-2xl border border-sunsetRed/40 bg-sunsetRed/10 p-4 text-sm text-sunsetRed">
              {error}
            </div>
          ) : (
            <div className="space-y-8">
              <WritingKPIs overview={data?.overview ?? null} loading={loading} />
              <WritingWeeklyTrend series={data?.weekly ?? null} loading={loading} />
            </div>
          )}
        </Container>
      </main>
    </>
  );
}
