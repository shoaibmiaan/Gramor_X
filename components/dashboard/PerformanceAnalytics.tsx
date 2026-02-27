import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MetricPoint } from '@/types/dashboard';

const TrendChart = dynamic(
  () => import('@/components/charts/TrendChart').then((module) => module.TrendChart),
  {
    ssr: false,
  },
);

export function PerformanceAnalytics({
  reading,
  writing,
  speaking,
}: {
  reading: MetricPoint[];
  writing: MetricPoint[];
  speaking: MetricPoint[];
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-medium">Performance Analytics</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<Skeleton className="h-44" />}>
          <TrendChart title="Reading score trend" points={reading} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-44" />}>
          <TrendChart title="Writing band trend" points={writing} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-44" />}>
          <TrendChart title="Speaking confidence trend" points={speaking} />
        </Suspense>
      </div>
    </Card>
  );
}
