// components/layouts/AdminLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import {
  LayoutQuickNavItem,
} from '@/components/layouts/shared/LayoutQuickNav';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

/**
 * AdminLayout
 * - Shared shell for /admin and /teacher consoles (keeps global header/footer from <Layout />)
 * - Sticky sub-nav with active state; DS tokens only
 * - Place main content in a card surface
 */
const AdminLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navItems: LayoutQuickNavItem[] = [
    { href: '/admin', label: 'Admin Overview' },
    { href: '/admin/partners', label: 'Partners' },
    { href: '/admin/students', label: 'Students' },
    { href: '/admin/reviews', label: 'Reviews' },
    { href: '/admin/reading', label: 'Reading Builder' },
    { href: '/admin/content/reading', label: 'Content' },
    { href: '/teacher', label: 'Teacher Home', activeClassName: 'bg-accent/10 text-accent' },
    { href: '/teacher/cohorts', label: 'Cohorts', activeClassName: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-background/90 pb-2 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <LayoutHero
          accent="admin"
          icon={ShieldCheck}
          eyebrow="Operations"
          title="Admin & Teacher Console"
          subtitle="Monitor partner success, manage student reviews, and handle live cohorts from a single command center."
          className="pb-2 sm:pb-4"
          quickNav={{ ariaLabel: 'Admin and teacher sections', items: navItems }}
          actions={
            <Button asChild variant="soft" tone="danger" elevateOnHover>
              <Link href="/admin/reports">View audit logs</Link>
            </Button>
          }
        >
          <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-red-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-red-100/90">
            12 new partner applications awaiting review.
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-red-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-red-100/80">
            Teacher onboarding: 3 cohorts launching this week—check materials before Friday.
          </div>
        </LayoutHero>
      </div>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(248,113,113,0.18)] dark:shadow-none">
          {children}
        </div>
      </Container>
    </div>
  );
};

export default AdminLayout;
export { AdminLayout };
