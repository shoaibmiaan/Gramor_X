import { memo, useMemo } from 'react';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useTierFeatures from '@/hooks/useTierFeatures';

type KpiCardsProps = {
  tier: SubscriptionTier;
};

type KpiMetric = {
  id: 'overallBand' | 'studyStreak' | 'practiceHours' | 'mockTests';
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  visible: boolean;
};

const KpiCards = ({ tier }: KpiCardsProps) => {
  const features = useTierFeatures(tier);

  const metrics = useMemo<KpiMetric[]>(() => {
    return [
      {
        id: 'overallBand',
        label: 'Overall Band',
        value: features.predictiveAnalytics ? '7.5' : '6.5',
        delta: features.predictiveAnalytics ? '+0.3 this month' : '+0.1 this month',
        trend: 'up',
        visible: true,
      },
      {
        id: 'studyStreak',
        label: 'Study Streak',
        value: '12 days',
        delta: '+2 days this week',
        trend: 'up',
        visible: true,
      },
      {
        id: 'practiceHours',
        label: 'Practice Hours',
        value: features.realtimeAnalytics ? '28h' : '14h',
        delta: features.realtimeAnalytics ? '+5h this week' : '+2h this week',
        trend: 'up',
        visible: true,
      },
      {
        id: 'mockTests',
        label: 'Mock Tests',
        value: features.exportReports ? '9 completed' : '4 completed',
        delta: features.exportReports ? '+3 this month' : '+1 this month',
        trend: 'up',
        visible: tier !== 'free' || features.studyBuddyAccess,
      },
    ];
  }, [features, tier]);

  return (
    <section id="overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.filter((metric) => metric.visible).map((metric) => (
        <article
          key={metric.id}
          className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {metric.trend === 'up' ? '▲' : '▼'} {metric.delta}
          </div>
        </article>
      ))}
    </section>
  );
};

export default memo(KpiCards);
