import React, { useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/design-system/Card';
import { logWritingProgressChartViewed } from '@/lib/analytics/writing-events';
import type { CriterionDelta, WritingProgressPoint } from '@/types/analytics';
import type { WritingCriterion } from '@/types/writing';

const CRITERION_LABEL: Record<WritingCriterion, string> = {
  task_response: 'Task Response',
  coherence_and_cohesion: 'Coherence',
  lexical_resource: 'Lexical',
  grammatical_range: 'Grammar',
};

const COLORS = {
  overall: 'var(--chart-writing)',
  task_response: 'rgb(var(--color-primary) / 1)',
  coherence_and_cohesion: 'rgb(var(--color-secondary) / 1)',
  lexical_resource: 'rgb(var(--color-accent) / 1)',
  grammatical_range: 'rgb(var(--color-success) / 1)',
};

type Props = {
  points: WritingProgressPoint[];
  deltas: CriterionDelta[];
};

const formatAttemptLabel = (index: number, total: number) => {
  if (total === 1) return 'Latest';
  if (index === total - 1) return 'Latest';
  if (index === total - 2) return 'Previous';
  return `Attempt ${total - index}`;
};

const BandProgressChart: React.FC<Props> = ({ points, deltas }) => {
  const chartData = useMemo(() => {
    if (!points || points.length === 0) return [];
    return points.map((point, index) => ({
      name: formatAttemptLabel(index, points.length),
      overall: point.overallBand,
      task_response: point.bandScores.task_response,
      coherence_and_cohesion: point.bandScores.coherence_and_cohesion,
      lexical_resource: point.bandScores.lexical_resource,
      grammatical_range: point.bandScores.grammatical_range,
    }));
  }, [points]);

  const deltaByCriterion = useMemo(() => {
    const map = new Map<string, CriterionDelta>();
    deltas.forEach((delta) => {
      map.set(delta.criterion, delta);
    });
    return map;
  }, [deltas]);

  useEffect(() => {
    if (chartData.length > 0) {
      logWritingProgressChartViewed({ attempts: chartData.length });
    }
  }, [chartData.length]);

  return (
    <Card padding="lg" insetBorder className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Your Improvement Journey</h2>
        <p className="text-sm text-muted-foreground">
          Track how each criterion has evolved across your last {points.length} attempts.
        </p>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough data yet. Complete another attempt to unlock trends.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                {Object.entries(COLORS).map(([key, color]) => (
                  <linearGradient id={`band-${key}`} key={key} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--chart-axis)" tickLine={false} />
              <YAxis domain={[0, 9]} stroke="var(--chart-axis)" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  borderRadius: 12,
                  border: '1px solid var(--chart-tooltip-border)',
                  color: 'var(--chart-tooltip-fg)',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="overall" stroke={COLORS.overall} fill="url(#band-overall)" strokeWidth={2} />
              <Area
                type="monotone"
                dataKey="task_response"
                stroke={COLORS.task_response}
                fill="url(#band-task_response)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="coherence_and_cohesion"
                stroke={COLORS.coherence_and_cohesion}
                fill="url(#band-coherence_and_cohesion)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="lexical_resource"
                stroke={COLORS.lexical_resource}
                fill="url(#band-lexical_resource)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="grammatical_range"
                stroke={COLORS.grammatical_range}
                fill="url(#band-grammatical_range)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {['overall', 'task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range'].map((key) => {
          const delta = deltaByCriterion.get(key) ?? null;
          if (!delta) return null;
          const isPositive = delta.delta > 0;
          const formattedKey = key === 'overall' ? 'Overall' : CRITERION_LABEL[key as WritingCriterion];
          return (
            <div key={key} className="rounded-ds-xl border border-border/60 bg-card/80 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{formattedKey}</p>
                <span
                  className={`text-sm font-semibold ${
                    delta.delta === 0 ? 'text-muted-foreground' : isPositive ? 'text-success' : 'text-danger'
                  }`}
                >
                  {delta.delta > 0 ? '+' : ''}
                  {delta.delta.toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Current band {delta.current.toFixed(1)}
                {typeof delta.previous === 'number' ? ` · Previous ${delta.previous.toFixed(1)}` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default BandProgressChart;
