import type { PropsWithChildren } from 'react';
import { TopNavbar } from '@/components/dashboard/TopNavbar';

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="flex flex-col min-h-screen">
        <TopNavbar />

        <main className="flex-1 space-y-12 p-6 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;