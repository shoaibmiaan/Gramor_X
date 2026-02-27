import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopNavbar } from '@/components/dashboard/TopNavbar';
import { Button } from '@/components/ui/Button';

export function DashboardShell({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="flex">
        <Sidebar collapsed={collapsed} />
        <div className="flex-1">
          <TopNavbar />
          <main className="space-y-6 p-4 md:p-8">
            <Button
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? 'Expand Menu' : 'Collapse Menu'}
            </Button>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
