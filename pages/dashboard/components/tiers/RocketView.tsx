import Head from 'next/head';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';
import WeaknessMap from '@/pages/dashboard/components/widgets/WeaknessMap';

type RocketViewProps = {
  userId: string | null;
  targetBand: number;
};

const RocketView = ({ userId, targetBand }: RocketViewProps) => {
  const tier: SubscriptionTier = 'rocket';
  const { data } = useDashboardData({ userId, tier, realtime: false });

  return (
    <>
      <Head>
        <title>Dashboard — Rocket — Gramor_X</title>
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
              { skill: 'Reading', score: 5.2, href: '/reading' },
              { skill: 'Listening', score: 6.1, href: '/exam-day' },
              { skill: 'Writing', score: 4.8, href: '/review/writing' },
              { skill: 'Speaking', score: 5.0, href: '/review/speaking' },
            ]}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Rocket Workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Advanced analytics and accelerated exam-performance tracking for Rocket.
              </p>
            </section>
            <NotificationCenter />
          </div>
        </main>
      </div>
    </>
  );
};

export default RocketView;
