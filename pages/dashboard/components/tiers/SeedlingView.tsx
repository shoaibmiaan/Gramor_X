import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import useAIInsights from '@/hooks/useAIInsights';
import useUsageLimits from '@/hooks/useUsageLimits';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import UpgradeModal from '@/pages/dashboard/components/shared/UpgradeModal';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';
import AIInsights from '@/pages/dashboard/components/widgets/AIInsights';
import UsageMeters from '@/pages/dashboard/components/widgets/UsageMeters';
import DailyLoginFlow from '@/pages/dashboard/components/widgets/DailyLoginFlow';
import { ChartSkeleton, InsightsSkeleton, KpiCardsSkeleton, UsageMetersSkeleton } from '@/pages/dashboard/components/widgets/Skeletons';

type SeedlingViewProps = {
  userId: string | null;
  targetBand: number;
};

const SeedlingView = ({ userId, targetBand }: SeedlingViewProps) => {
  const tier: SubscriptionTier = 'seedling';
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const router = useRouter();
  const { data, loading } = useDashboardData({ userId, tier, realtime: false });
  const insights = useAIInsights(data, tier);
  const usage = useUsageLimits({
    tier,
    readingTestsUsed: data.performance.mockTests,
    writingFeedbackUsed: data.usageLimits.aiWritingUsed,
    speakingAnalysisUsed: data.usageLimits.speakingAnalysisUsed,
  });

  return (
    <>
      <Head>
        <title>Dashboard — Seedling — Gramor_X</title>
      </Head>
      <Header tier={tier} />
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <Sidebar />
        <main className="space-y-4" id="content-grid">
          <DailyLoginFlow
            streak={data.performance.studyStreak}
            insights={insights}
            tasks={['Complete 1 writing drill', 'Review yesterday’s mistakes', 'Take a timed reading set']}
          />
          {loading ? <KpiCardsSkeleton /> : <KpiCards tier={tier} />}
          {loading ? <ChartSkeleton /> : <BandProgress points={data.bandHistory} targetBand={targetBand} tier={tier} />}
          {loading ? (
            <InsightsSkeleton />
          ) : (
            <AIInsights insights={insights} tier={tier} onAction={(href) => void router.push(href)} onUpgrade={() => setUpgradeOpen(true)} />
          )}
          {loading ? <UsageMetersSkeleton /> : <UsageMeters usage={usage} onUpgrade={() => setUpgradeOpen(true)} />}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Seedling Workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">Personalized roadmap and growth-focused insights for the Seedling tier.</p>
            </section>
            <NotificationCenter />
          </div>
        </main>
      </div>
      <UpgradeModal
        open={upgradeOpen}
        trigger="curiosity"
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={() => {
          setUpgradeOpen(false);
          void router.push('/checkout');
        }}
      />
    </>
  );
};

export default SeedlingView;
