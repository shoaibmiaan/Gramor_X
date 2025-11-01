// components/layouts/ReportsLayout.tsx
import * as React from 'react';
import { BarChart3 } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

const ReportsLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <LayoutHero
        accent="reports"
        icon={BarChart3}
        eyebrow="Analytics"
        title="Reports & Insights"
        subtitle="Review band progression, placement diagnostics, and export-ready insights for your cohort."
        quickNav={{
          ariaLabel: 'Reports sections',
          items: [
            { href: '/reports/band-analytics', label: 'Band Analytics' },
            { href: '/placement', label: 'Placement Test' },
          ],
        }}
      >
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100/90">
          Export detailed scorecards to share progress with stakeholders in one click.
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-slate-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100/80">
          Placement analytics refresh after every mock exam—check back for new trends.
        </div>
      </LayoutHero>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(148,163,184,0.18)] dark:shadow-none">{children}</div>
      </Container>
    </div>
  );
};

export default ReportsLayout;
export { ReportsLayout };
