import type { NextPage } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { AIOverviewPanel } from '@/components/dashboard/AIOverviewPanel';
import { PerformanceAnalytics } from '@/components/dashboard/PerformanceAnalytics';
import { SkillModulesGrid } from '@/components/dashboard/SkillModulesGrid';
import { SmartRecommendations } from '@/components/dashboard/SmartRecommendations';
import { AICommandCenter } from '@/components/dashboard/AICommandCenter';
import { TierGuard } from '@/components/dashboard/TierGuard';
import { overview, recommendations, skillModules, trendData } from '@/features/dashboard/data';
import type { SubscriptionTier } from '@/types/dashboard';

const tier: SubscriptionTier = 'rocket';

const DashboardPage: NextPage = () => {
  return (
    <DashboardShell>
      <section className="space-y-6">
        <h1 className="text-2xl font-semibold">AI Command Center</h1>
        <AIOverviewPanel
          currentBand={overview.currentBand}
          weeklyImprovement={overview.weeklyImprovement}
          nextAction={overview.nextAction}
        />
        <TierGuard tier={tier} feature="advancedAnalytics" minimumTier="rocket">
          <PerformanceAnalytics
            reading={trendData.reading}
            writing={trendData.writing}
            speaking={trendData.speaking}
          />
        </TierGuard>
        <SkillModulesGrid modules={skillModules} />
        <TierGuard tier={tier} feature="fullAiInsights" minimumTier="owl">
          <SmartRecommendations items={recommendations} />
        </TierGuard>
      </section>
      <AICommandCenter />
    </DashboardShell>
  );
};

export default DashboardPage;
