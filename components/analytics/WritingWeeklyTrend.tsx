import React, { useEffect, useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/design-system/Card';
import { Skeleton } from '@/components/design-system/Skeleton';
import { logWritingAnalyticsTrendChange } from '@/lib/analytics/writing-events';
import type { WeeklySeries } from '@/types/analytics';

type Props = {
  series: WeeklySeries | null;
  loading?: boolean;
};

const numberFormatter = new Intl.NumberFormat();

export const WritingWeeklyTrend: React.FC<Props> = ({ series, loading = false }) => {
  const chartData = useMemo(() => {
    if (!series?.points) return [];
    return series.points.map((point) => ({
      label: point.label,
      attempts: point.attempts,
      band: point.averageBand,
      words: point.averageWordCount,
    }));
  }, [series]);

  useEffect(() => {
    if (!loading && chartData.length > 0) {
      logWritingAnalyticsTrendChange({
        weeks: chartData.length,
        attempts: series?.totalAttempts ?? 0,
        source: 'chart',
      });
    }
  }, [loading, chartData.length, series?.totalAttempts]);

  const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const previousPoint = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const attemptDelta = latestPoint && previousPoint ? latestPoint.attempts - previousPoint.attempts : 0;

  return (
    <Card padding="lg" insetBorder className="space-y-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Weekly Attempt Trends</h2>
          <p className="text-sm text-muted-foreground">
            Compare how many essays you submit each week and how your average band shifts over time.
          </p>
        </div>
        {!loading && latestPoint && (
          <div className="rounded-ds-xl border border-border/60 bg-muted/10 px-4 py-2 text-sm text-muted-foreground">
            Last week · {numberFormatter.format(latestPoint.attempts)} attempts · band {latestPoint.band.toFixed(1)}
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full rounded-ds-2xl" />
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Complete at least one graded attempt to unlock week-over-week insights.
        </p>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" stroke="var(--chart-axis)" tickLine={false} />
              <YAxis
                yAxisId="attempts"
                allowDecimals={false}
                stroke="var(--chart-axis)"
                tickLine={false}
                width={40}
              />
              <YAxis
                yAxisId="band"
                orientation="right"
                domain={[0, 9]}
                stroke="var(--chart-axis)"
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  borderRadius: 12,
                  border: '1px solid var(--chart-tooltip-border)',
                  color: 'var(--chart-tooltip-fg)',
                }}
              />
              <Legend />
              <Bar
                yAxisId="attempts"
                dataKey="attempts"
                name="Attempts"
                fill="rgb(var(--color-primary) / 0.65)"
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="band"
                type="monotone"
                dataKey="band"
                name="Avg Band"
                stroke="var(--chart-writing)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && latestPoint && (
        <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>
            Average words per attempt last week: {numberFormatter.format(latestPoint.words ?? 0)}
          </span>
          {previousPoint && (
            <span>
              WoW attempts {attemptDelta >= 0 ? '+' : ''}
              {numberFormatter.format(attemptDelta)}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

export default WritingWeeklyTrend;
