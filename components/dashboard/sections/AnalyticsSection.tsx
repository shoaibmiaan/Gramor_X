import dynamic from 'next/dynamic';
import { Card } from '@/components/design-system/Card';

const TrendChart = dynamic(
  () => import('@/components/charts/TrendChart').then((mod) => mod.TrendChart),
  {
    loading: () => <p className="text-xs text-muted-foreground">Loading chart…</p>,
  },
);

export function AnalyticsSection({ points }: { points: { label: string; band: number }[] }) {
  return (
    <section className="mt-12">
      <Card className="p-6" interactive>
        <TrendChart
          title="Improvement Graph"
          points={(points.length ? points : [{ label: 'No data', band: 0 }]).map((p) => ({
            label: p.label,
            value: p.band,
          }))}
        />
      </Card>
    </section>
  );
}
