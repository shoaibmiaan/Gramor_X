import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';

import type { PhonemeScore } from '@/lib/speaking/scoreAudio';

type IPAHeatmapProps = {
  phonemes: PhonemeScore[];
  weakTargets?: string[];
};

function classifyTone(accuracy: number) {
  if (accuracy >= 0.85) return 'bg-success/10 text-success border-success/20';
  if (accuracy >= 0.7) return 'bg-warning/10 text-warning border-warning/30';
  return 'bg-danger/10 text-danger border-danger/30';
}

export function IPAHeatmap({ phonemes, weakTargets = [] }: IPAHeatmapProps) {
  const aggregates = new Map<string, { total: number; count: number }>();
  phonemes.forEach((item) => {
    const bucket = aggregates.get(item.symbol) ?? { total: 0, count: 0 };
    bucket.total += item.accuracy;
    bucket.count += 1;
    aggregates.set(item.symbol, bucket);
  });

  const rows = Array.from(aggregates.entries())
    .map(([symbol, bucket]) => ({
      symbol,
      accuracy: bucket.count ? bucket.total / bucket.count : 0,
      count: bucket.count,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  if (rows.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No phoneme feedback yet. Record an attempt to see breakdowns.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h3 className="text-base font-semibold text-foreground">Phoneme accuracy heatmap</h3>
        <p className="text-xs text-muted-foreground">{phonemes.length} total phoneme observations</p>
      </div>
      <div className="divide-y divide-border/40">
        {rows.map((row) => {
          const percent = Math.round(row.accuracy * 100);
          const tone = classifyTone(row.accuracy);
          const isWeak = weakTargets.includes(row.symbol);
          return (
            <div key={row.symbol} className="flex items-center gap-4 px-4 py-3">
              <div
                className={`flex h-10 w-16 items-center justify-center rounded-ds-lg border text-sm font-semibold ${tone}`}
                aria-label={`${row.symbol} accuracy ${percent}%`}
              >
                {row.symbol}
              </div>
              <div className="flex-1">
                <ProgressBar value={percent} aria-label={`${row.symbol} accuracy`} />
                <p className="mt-1 text-xs text-muted-foreground">{row.count} samples</p>
              </div>
              {isWeak && (
                <span className="rounded-ds-full bg-danger/15 px-3 py-1 text-xs font-medium text-danger">Focus</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default IPAHeatmap;
