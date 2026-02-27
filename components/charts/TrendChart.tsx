import { memo } from 'react';
import clsx from 'clsx';
import type { MetricPoint } from '@/types/dashboard';

type TrendChartProps = {
  title: string;
  points: MetricPoint[];
};

const heightClass = (value: number, max: number) => {
  const ratio = value / max;
  if (ratio > 0.9) return 'h-16';
  if (ratio > 0.75) return 'h-14';
  if (ratio > 0.6) return 'h-12';
  if (ratio > 0.45) return 'h-10';
  return 'h-8';
};

function TrendChartComponent({ title, points }: TrendChartProps) {
  const max = Math.max(...points.map((point) => point.value));

  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium">{title}</h3>
      <div className="grid grid-cols-4 gap-2">
        {points.map((point) => (
          <div key={point.label} className="space-y-2 text-center">
            <div className="flex h-20 items-end justify-center rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
              <div
                className={clsx('w-6 rounded-md bg-indigo-500', heightClass(point.value, max))}
              />
            </div>
            <p className="text-xs text-slate-400">{point.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TrendChart = memo(TrendChartComponent);
