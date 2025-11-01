// components/layouts/ReportsLayout.tsx
import * as React from 'react';
import { BarChart3, Target, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const ReportsLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="info">Insights</Badge>
        <span className="text-sm font-medium">Latest placement results synced 3 min ago</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Average band</span>
          <span className="text-2xl font-bold text-gradient-primary">6.7</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Top skill growth</span>
          <span className="text-sm font-semibold">Writing +18%</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-electricBlue/15 via-background to-background text-foreground">
      <LayoutHero
        accent="reports"
        eyebrow="Reports & Analytics"
        title="Surface deep IELTS insights and placement performance"
        description="Monitor bands across cohorts, explore placement data, and share export-ready insights with stakeholders."
        actions={(
          <>
            <Button href="/reports/band-analytics" size="lg">
              View analytics
            </Button>
            <Button href="/placement" variant="soft" tone="info" size="lg">
              Launch placement test
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Reports sections"
          items={[
            { href: '/reports/band-analytics', label: 'Band Analytics', icon: <BarChart3 className="h-4 w-4" /> },
            { href: '/placement', label: 'Placement Test', icon: <Target className="h-4 w-4" /> },
            { href: '/reports/exports', label: 'Exports', icon: <ClipboardCheck className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="reports">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default ReportsLayout;
export { ReportsLayout };
