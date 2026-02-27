import Head from 'next/head';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';
import WeaknessMap from '@/pages/dashboard/components/widgets/WeaknessMap';

type OwlViewProps = {
  userId: string | null;
  targetBand: number;
};

const OwlView = ({ userId, targetBand }: OwlViewProps) => {
  const tier: SubscriptionTier = 'owl';
  const { data } = useDashboardData({ userId, tier, realtime: true });

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
          <WeaknessMap
            tier={tier}
            skillScores={[
              { skill: 'Reading', score: 6.2, href: '/reading' },
              { skill: 'Listening', score: 6.8, href: '/exam-day' },
              { skill: 'Writing', score: 5.9, href: '/review/writing' },
              { skill: 'Speaking', score: 6.0, href: '/review/speaking' },
            ]}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Owl Workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Premium executive insights, real-time coaching, and reporting for Owl tier.
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
