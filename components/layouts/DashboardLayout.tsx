// components/layouts/DashboardLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { GaugeCircle } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

const QUICK_LINKS = [
  { href: '/study-plan', label: 'Study Plan' },
  { href: '/progress', label: 'Analytics' },
  { href: '/listening', label: 'Listening' },
  { href: '/reading', label: 'Reading' },
  { href: '/writing', label: 'Writing' },
  { href: '/speaking/simulator', label: 'Speaking' },
  { href: '/pricing', label: 'Upgrade' },
] as const;

const DashboardLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <LayoutHero
        accent="dashboard"
        icon={GaugeCircle}
        eyebrow="Dashboard"
        title="Your control center"
        subtitle="Track progress, resume the next activity, and jump into any IELTS skill with a single tap."
        actions={
          <Button asChild variant="soft" tone="success" elevateOnHover>
            <Link href="/study-plan">Resume study plan</Link>
          </Button>
        }
        quickNav={{
          ariaLabel: 'Dashboard quick links',
          items: QUICK_LINKS.map((item) => ({ ...item })),
        }}
      >
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-emerald-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-emerald-100/90">
          Next up: Listening Mock 3 unlocks in your plan—finish by Sunday for a streak bonus.
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-emerald-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-emerald-100/80">
          Tip: check Analytics to compare this week’s accuracy with your baseline.
        </div>
      </LayoutHero>

      <main>
        <Container className="pb-10">{children}</Container>
      </main>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
