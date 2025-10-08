'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Scatter,
  Cell,
} from 'recharts';

type Datum = {
  date: string;
  completed: number;
  total: number;
};

type Props = {
  data: Datum[];
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type HeatmapPoint = Datum & {
  week: number;
  dayIndex: number;
  label: string;
  size: number;
};

function toPoints(data: Datum[]): HeatmapPoint[] {
  if (data.length === 0) return [];
  const first = data[0];
  const start = new Date(`${first.date}T00:00:00Z`);
  return data.map((entry) => {
    const current = new Date(`${entry.date}T00:00:00Z`);
    const diffDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);
    const week = Math.floor(diffDays / 7);
    const dayIndex = ((current.getUTCDay() + 6) % 7); // convert Sun(0) -> 6
    return {
      ...entry,
      week,
      dayIndex,
      label: new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(current),
      size: 16,
    };
  });
}

function colorFor(entry: Datum) {
  if (entry.total === 0) return '#E5E7EB';
  const ratio = entry.completed / entry.total;
  if (ratio === 0) return '#E5E7EB';
  if (ratio < 0.5) return '#93C5FD';
  if (ratio < 1) return '#3B82F6';
  return '#0EA5E9';
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null;
  const point = payload[0].payload as HeatmapPoint;
  return (
    <div className="rounded-ds-2xl border border-border bg-card/95 p-3 text-small shadow-lg">
      <p className="font-semibold">{point.label}</p>
      {point.total === 0 ? (
        <p className="text-muted-foreground">No tasks scheduled</p>
      ) : (
        <p className="text-muted-foreground">
          {point.completed} of {point.total} completed
        </p>
      )}
    </div>
  );
}

export const StreakHeatmap: React.FC<Props> = ({ data }) => {
  const points = useMemo(() => toPoints(data), [data]);
  const maxWeek = points.reduce((max, point) => Math.max(max, point.week), 0);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-ds-2xl border border-dashed border-border text-small text-muted-foreground">
        Complete a task to start your streak calendar.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 20, right: 12, bottom: 12, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          type="number"
          dataKey="week"
          tickFormatter={(value: number) => `Week ${value + 1}`}
          domain={[0, Math.max(maxWeek, 5)]}
          ticks={Array.from({ length: Math.max(maxWeek + 1, 6) }, (_, i) => i)}
        />
        <YAxis
          type="number"
          dataKey="dayIndex"
          tickFormatter={(value: number) => WEEKDAYS[value]}
          ticks={[0, 1, 2, 3, 4, 5, 6]}
          width={48}
        />
        <ZAxis type="number" dataKey="size" range={[16, 16]} />
        <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
        <Scatter data={points} shape="square">
          {points.map((point) => (
            <Cell key={point.date} fill={colorFor(point)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default StreakHeatmap;
