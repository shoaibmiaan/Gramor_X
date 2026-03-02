import type { ReactNode } from 'react';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import NotificationCenter from '@/pages/dashboard/components/shared/NotificationCenter';
import KpiCards from '@/pages/dashboard/components/widgets/KpiCards';

type FreeViewProps = {
  children?: ReactNode;
};

const FreeView = ({ children }: FreeViewProps) => {
  return (
    <DashboardLayout>
      <main className="space-y-4" id="content-grid">
        <KpiCards tier="free" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-border/70 bg-background/40 p-1">
            {children}
          </section>
          <NotificationCenter />
        </div>
      </main>
    </DashboardLayout>
  );
};

export default FreeView;
