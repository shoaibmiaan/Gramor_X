'use client';

import React, { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatWeekLabel, type SkillAverage, type SkillKey, type TrendPoint } from '@/lib/analytics/progress';

const SKILL_ORDER: SkillKey[] = ['reading', 'listening', 'writing', 'speaking'];
const COLOR_MAP: Record<SkillKey, string> = {
  reading: 'var(--chart-reading)',
  listening: 'var(--chart-listening)',
  writing: 'var(--chart-writing)',
  speaking: 'var(--chart-speaking)',
};

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) {
    return <Fallback>No trend data yet</Fallback>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={(value) => formatWeekLabel(value).split('–')[0]}
          tick={{ fill: 'var(--chart-axis)' }}
        />
        <YAxis
          domain={[0, 9]}
          tickFormatter={(value: number) => numberFormatter.format(value)}
          tick={{ fill: 'var(--chart-axis)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '12px',
            color: 'var(--chart-tooltip-fg)',
          }}
          formatter={(value: number, label: SkillKey) => [numberFormatter.format(value), formatSkill(label)]}
          labelFormatter={(value) => formatWeekLabel(String(value))}
        />
        <Legend formatter={(value) => formatSkill(value as string)} />
        {SKILL_ORDER.map((skill) => (
          <Line
            key={skill}
            type="monotone"
            dataKey={skill}
            stroke={COLOR_MAP[skill]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SkillAreaChart({ data }: { data: SkillAverage[] }) {
  if (!data || data.length === 0) {
    return <Fallback>No per-skill averages yet</Fallback>;
  }

  const gradientId = useId();

  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        label: formatSkill(entry.skill),
      })),
    [data],
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
        <defs>
          <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-area)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--chart-area)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fill: 'var(--chart-axis)' }} />
        <YAxis
          domain={[0, 9]}
          tickFormatter={(value: number) => numberFormatter.format(value)}
          tick={{ fill: 'var(--chart-axis)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '12px',
            color: 'var(--chart-tooltip-fg)',
          }}
          formatter={(value: number) => [numberFormatter.format(value), 'Average band']}
        />
        <Area
          type="monotone"
          dataKey="average"
          stroke="var(--chart-area-stroke)"
          fill={`url(#${gradientId}-fill)`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function formatSkill(skill: string): string {
  return skill
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const Fallback: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-64 w-full items-center justify-center rounded-ds-xl border border-border/60 text-muted-foreground">
    {children}
  </div>
);

export default TrendLineChart;
