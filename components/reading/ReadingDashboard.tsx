import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { Icon } from '@/components/design-system/Icon';
import { useDashboardData } from '@/hooks/reading/useDashboardData';
import { useForecastData } from '@/hooks/reading/useForecastData';
import { DashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary';
import { ActivityHeatmap } from '@/components/reading/ActivityHeatmap';
import { ReadingForecastPanel } from './ReadingForecastPanel';

// Helper functions
function pct(n?: number, digits = 0) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}
function band(b?: number, std?: number) {
  if (typeof b !== 'number' || !isFinite(b)) return '—';
  return typeof std === 'number' && isFinite(std) && std > 0 ? `${b.toFixed(1)} (±${std.toFixed(1)})` : b.toFixed(1);
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </Card>
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-24 w-full" />
        </Card>
      ))}
    </div>
  </div>
);

const ReadingDashboardInner: React.FC = () => {
  const { data, isLoading, error } = useDashboardData();
  const { data: forecastData, isLoading: forecastLoading } = useForecastData();

  if (error) {
    return <Alert variant="warning" title="Couldn’t load dashboard">{error.message}</Alert>;
  }

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const k = data.kpis ?? {};
  const acc10 = typeof k.accuracy10 === 'number' ? clamp01(k.accuracy10) : undefined;
  const accDelta = typeof k.accuracyDelta10 === 'number' ? k.accuracyDelta10 : undefined;

  const heatmapData = data.activity ?? [];
  const recommendations = data.recommendations ?? [
    { label: 'Practice TFNG questions', href: '/reading?type=tfng' },
    { label: 'Review latest attempt', href: `/mock/reading/review/${data.recent?.[0]?.id || ''}` },
    { label: 'Speed drill', href: '/mock/reading/drill/speed' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <Card className="p-4 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Band (Reading)</div>
            <div className="text-lg font-semibold">{band(k.bandEstimate, k.bandStd)}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Accuracy (last 10)</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{pct(acc10)}</span>
              {typeof accDelta === 'number' && (
                <Badge variant={accDelta >= 0 ? 'success' : 'danger'} size="xs">
                  {accDelta >= 0 ? '+' : ''}{(accDelta * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Speed</div>
            <div className="text-lg font-semibold">
              {k.avgSecPerQ ? `${(k.avgSecPerQ / 60).toFixed(2)} min/Q` : '—'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Streak</div>
            <div className="text-lg font-semibold">{k.streakDays ?? '—'}d</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-lg font-semibold">{k.totalPractices ?? '—'}</div>
          </div>
        </div>
      </Card>

      {/* AI Coach (original section – keep as is) */}
      {/* ... */}

      {/* Forecast + Heatmap */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <ReadingForecastPanel targetBand={7.0} />
        </div>
        <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70 md:col-span-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Icon name="calendar" className="h-4 w-4" />
            Practice Activity
          </h3>
          {heatmapData.length > 0 ? (
            <ActivityHeatmap data={heatmapData} />
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet. Start practicing to see your heatmap.</p>
          )}
        </Card>
      </div>

      {/* Recommended Next Steps */}
      <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="compass" className="h-4 w-4" />
          Recommended Next Steps
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((rec, idx) => (
            <Link key={idx} href={rec.href} className="block">
              <div className="rounded-lg border border-border/60 p-4 hover:bg-muted/40 transition">
                <p className="font-medium text-sm">{rec.label}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to start</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Recent sessions, saved, queued – original sections unchanged */}
      {/* ... */}
    </div>
  );
};

export const ReadingDashboard: React.FC = () => {
  return (
    <DashboardErrorBoundary>
      <ReadingDashboardInner />
    </DashboardErrorBoundary>
  );
};

export default ReadingDashboard;