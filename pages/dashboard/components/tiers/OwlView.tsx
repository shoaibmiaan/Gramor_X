import Head from 'next/head';

import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';

const OwlView = () => {
  return (
    <>
      <Head>
        <title>Dashboard — Owl — Gramor_X</title>
      </Head>
      <Header tier="owl" />
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <Sidebar />
        <main className="space-y-4" id="content-grid">
          <KpiCards tier="owl" />
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
