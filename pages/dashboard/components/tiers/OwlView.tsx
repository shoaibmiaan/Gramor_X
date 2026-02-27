import { useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import useAIInsights from '@/hooks/useAIInsights';
import useUsageLimits from '@/hooks/useUsageLimits';
import predictiveEngine from '@/utils/predictiveEngine';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';
import WeaknessMap from '@/pages/dashboard/components/widgets/WeaknessMap';
import AIInsights from '@/pages/dashboard/components/widgets/AIInsights';
import UsageMeters from '@/pages/dashboard/components/widgets/UsageMeters';
import ExportReports from '@/pages/dashboard/components/widgets/ExportReports';

type OwlViewProps = {
  userId: string | null;
  targetBand: number;
};

const OwlView = ({ userId, targetBand }: OwlViewProps) => {
  const tier: SubscriptionTier = 'owl';
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
          <KpiCards tier={tier} />
          <BandProgress points={data.bandHistory} targetBand={targetBand} tier={tier} />

          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <h3 className="text-base font-semibold">Executive projection</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Predicted {prediction.predictedBand} • Confidence {prediction.confidencePercentage}% •
              ETA {new Date(prediction.estimatedDate).toLocaleDateString()}
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

          <AIInsights
            insights={insights}
            tier={tier}
            onAction={(href) => void router.push(href)}
            onUpgrade={() => void router.push('/checkout')}
          />
          <UsageMeters usage={usage} onUpgrade={() => void router.push('/checkout')} />
          <ExportReports tier={tier} data={data} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Owl intelligence workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Realtime coaching signals, deep projections, and enterprise reporting.
              </p>
            </section>
            <NotificationCenter />
          </div>
        </main>
      </div>
    </>
  );
};

export default OwlView;
