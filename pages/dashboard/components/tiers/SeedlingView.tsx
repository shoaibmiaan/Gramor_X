import Head from 'next/head';
import { useRouter } from 'next/router';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import useAIInsights from '@/hooks/useAIInsights';
import useUsageLimits from '@/hooks/useUsageLimits';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';
import AIInsights from '@/pages/dashboard/components/widgets/AIInsights';
import UsageMeters from '@/pages/dashboard/components/widgets/UsageMeters';
import {
  ChartSkeleton,
  InsightsSkeleton,
  KpiCardsSkeleton,
  UsageMetersSkeleton,
} from '@/pages/dashboard/components/widgets/Skeletons';

type SeedlingViewProps = {
  userId: string | null;
  targetBand: number;
};

const SeedlingView = ({ userId, targetBand }: SeedlingViewProps) => {
  const tier: SubscriptionTier = 'seedling';
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
          {loading ? <KpiCardsSkeleton /> : <KpiCards tier={tier} />}
          {loading ? <ChartSkeleton /> : <BandProgress points={data.bandHistory} targetBand={targetBand} tier={tier} />}
          {loading ? (
            <InsightsSkeleton />
          ) : (
            <AIInsights
              insights={insights}
              tier={tier}
              onAction={(href) => void router.push(href)}
              onUpgrade={() => void router.push('/checkout')}
            />
          )}
          {loading ? (
            <UsageMetersSkeleton />
          ) : (
            <UsageMeters usage={usage} onUpgrade={() => void router.push('/checkout')} />
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Focus for this week</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete 3 guided sessions and one timed test to stay on track.
              </p>
            </section>
            <NotificationCenter />
          </div>
        </main>
      </div>
    </>
  );
};

export default SeedlingView;
