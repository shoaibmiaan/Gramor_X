import type { NextPage } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { AIOverviewPanel } from '@/components/dashboard/AIOverviewPanel';
import { PerformanceAnalytics } from '@/components/dashboard/PerformanceAnalytics';
import { SkillModulesGrid } from '@/components/dashboard/SkillModulesGrid';
import { SmartRecommendations } from '@/components/dashboard/SmartRecommendations';
import { AICommandCenter } from '@/components/dashboard/AICommandCenter';
import { TierGuard } from '@/components/dashboard/TierGuard';
import { skillModules, trendData } from '@/features/dashboard/data';
import useEntitlement from '@/hooks/useEntitlement';
import useDashboardAggregate from '@/hooks/useDashboardAggregate';

const DashboardPage: NextPage = () => {
  const entitlement = useEntitlement(undefined);
  const { aggregate } = useDashboardAggregate(true);

  const recommendations = (aggregate?.recommendations ?? [])
    .map((item) => item.content?.summary)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  const currentBand = aggregate?.currentBand == null ? '—' : aggregate.currentBand.toFixed(1);
  const weeklyImprovement = aggregate?.progress.activeStreak ? `+${Math.min(aggregate.streakDays, 20)}%` : '+0%';
  const nextAction =
    recommendations[0] ??
    'Complete one focused skill practice and review the latest recommendation to keep your momentum.';

  return (
    <DashboardShell>
      <section className="space-y-6">
        <h1 className="text-2xl font-semibold">AI Command Center</h1>
        <AIOverviewPanel currentBand={currentBand} weeklyImprovement={weeklyImprovement} nextAction={nextAction} />
        <TierGuard tier={entitlement.tier} feature="advancedInsights">
          <PerformanceAnalytics reading={trendData.reading} writing={trendData.writing} speaking={trendData.speaking} />
        </TierGuard>
        <SkillModulesGrid modules={skillModules} />
        <TierGuard tier={entitlement.tier} feature="realtimeDashboard">
          <SmartRecommendations items={recommendations.length ? recommendations : ['No active recommendations yet.']} />
        </TierGuard>
      </section>
      <AICommandCenter />
    </DashboardShell>
  );
};

export default DashboardPage;
