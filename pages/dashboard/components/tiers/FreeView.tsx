import type { ReactNode } from 'react';

import Header from '@/pages/dashboard/components/shared/Header';
import Sidebar from '@/pages/dashboard/components/shared/Sidebar';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';

type FreeViewProps = {
  children?: ReactNode;
};

const FreeView = ({ children }: FreeViewProps) => {
  return (
    <>
      <Header tier="free" />
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <Sidebar />
        <main className="space-y-4" id="content-grid">
          <KpiCards tier="free" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-border/70 bg-background/40 p-1">{children}</section>
            <NotificationCenter />
          </div>
        </main>
      </div>
    </>
  );
};

export default FreeView;
