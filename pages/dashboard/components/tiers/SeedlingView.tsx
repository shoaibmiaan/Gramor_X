import Head from 'next/head';

import type { SubscriptionTier } from '@/lib/navigation/types';
import useDashboardData from '@/hooks/useDashboardData';
import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';
import BandProgress from '@/pages/dashboard/components/widgets/BandProgress';

type SeedlingViewProps = {
  userId: string | null;
  targetBand: number;
};

const SeedlingView = ({ userId, targetBand }: SeedlingViewProps) => {
  const tier: SubscriptionTier = 'seedling';
  const { data, loading } = useDashboardData({ userId, tier, realtime: false });

  return (
    <>
      <Head>
        <title>Dashboard — Seedling — Gramor_X</title>
      </Head>
      <Header tier={tier} />
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <Sidebar />
        <main className="space-y-4" id="content-grid">
          <KpiCards tier={tier} />
          <BandProgress points={data.bandHistory} targetBand={targetBand} tier={tier} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <h2 className="text-xl font-semibold">Seedling Workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Personalized roadmap and growth-focused insights for the Seedling tier.
              </p>
              {loading ? <p className="mt-3 text-xs text-muted-foreground">Loading dashboard data…</p> : null}
            </section>
            <NotificationCenter />
          </div>
        </main>
      </div>
    </>
  );
};

export default SeedlingView;
