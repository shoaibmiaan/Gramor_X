import { useMemo, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import useAIInsights from '@/hooks/useAIInsights';
import useUsageLimits from '@/hooks/useUsageLimits';
import predictiveEngine from '@/utils/predictiveEngine';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import UpgradeModal from '@/pages/dashboard/components/shared/UpgradeModal';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';
import WeaknessMap from '@/pages/dashboard/components/widgets/WeaknessMap';
import AIInsights from '@/pages/dashboard/components/widgets/AIInsights';
import UsageMeters from '@/pages/dashboard/components/widgets/UsageMeters';
import DailyLoginFlow from '@/pages/dashboard/components/widgets/DailyLoginFlow';
import ExportReports from '@/pages/dashboard/components/widgets/ExportReports';

const Achievements = dynamic(() => import('@/pages/dashboard/components/widgets/Achievements'), {
  ssr: false,
});

type OwlViewProps = {
  userId: string | null;
  targetBand: number;
};

const OwlView = ({ userId, targetBand }: OwlViewProps) => {
  const tier: SubscriptionTier = 'owl';
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const router = useRouter();
  const { data } = useDashboardData({ userId, tier, realtime: true });
  const insights = useAIInsights(data, tier);
  const usage = useUsageLimits({
    tier,
    readingTestsUsed: data.performance.mockTests,
    writingFeedbackUsed: data.usageLimits.aiWritingUsed,
    speakingAnalysisUsed: data.usageLimits.speakingAnalysisUsed,
  });

  const prediction = useMemo(
    () => predictiveEngine(data.bandHistory, data.studyLogs),
    [data.bandHistory, data.studyLogs],
  );

  return (
    <>
      <Head>
        <title>Dashboard — Owl — Gramor_X</title>
      </Head>
      <Header tier={tier} />
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <Sidebar />
        <main className="space-y-4" id="content-grid">
          <DailyLoginFlow
            streak={data.performance.studyStreak}
            insights={insights}
            tasks={['Review coach notes', 'Complete adaptive speaking drill', 'Export weekly progress report']}
          />
          <KpiCards tier={tier} />
          <BandProgress points={data.bandHistory} targetBand={targetBand} tier={tier} />
          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <h3 className="text-base font-semibold">Predictive engine</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Predicted band {prediction.predictedBand} • confidence {prediction.confidencePercentage}% • ETA {new Date(prediction.estimatedDate).toLocaleDateString()}
            </p>
          </section>
          <WeaknessMap
            tier={tier}
            skillScores={[
              { skill: 'Reading', score: 6.2, href: '/reading' },
              { skill: 'Listening', score: 6.8, href: '/exam-day' },
              { skill: 'Writing', score: 5.9, href: '/review/writing' },
              { skill: 'Speaking', score: 6.0, href: '/review/speaking' },
            ]}
          />
          <AIInsights insights={insights} tier={tier} onAction={(href) => void router.push(href)} onUpgrade={() => setUpgradeOpen(true)} />
          <UsageMeters usage={usage} onUpgrade={() => setUpgradeOpen(true)} />
          <Achievements performance={data.performance} />
          <ExportReports tier={tier} data={data} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Owl Workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">Premium executive insights, real-time coaching, and reporting for Owl tier.</p>
            </section>
            <NotificationCenter />
          </div>
        </main>
      </div>
      <UpgradeModal
        open={upgradeOpen}
        trigger="plateau"
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={() => {
          setUpgradeOpen(false);
          void router.push('/checkout');
        }}
      />
    </>
  );
};

export default OwlView;
