// components/layouts/InstitutionsLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import type { LayoutQuickNavItem } from '@/components/layouts/shared/LayoutQuickNav';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

const InstitutionsLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();

  // Derive org context (best-effort) for quick links
  const match = pathname.match(/^\/institutions\/([^/]+)/);
  const orgId = match?.[1];

  const navItems: LayoutQuickNavItem[] = [
    { href: '/institutions', label: 'All Orgs' },
  ];

  if (orgId) {
    navItems.push(
      { href: `/institutions/${orgId}`, label: 'Overview' },
      { href: `/institutions/${orgId}/students`, label: 'Students' },
      { href: `/institutions/${orgId}/reports`, label: 'Reports' },
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-background/90 pb-2 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <LayoutHero
          accent="institutions"
          icon={Building2}
          eyebrow="Institutions Portal"
          title="Manage academies"
          subtitle="Oversee cohorts, coach assignments, and analytics for every partner organization."
          className="pb-2 sm:pb-4"
          quickNav={{ ariaLabel: 'Institution sections', items: navItems }}
          actions={
            <Button asChild variant="soft" tone="info" elevateOnHover>
              <Link href="/institutions/new">Add institution</Link>
            </Button>
          }
        >
          {orgId ? (
            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-indigo-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-indigo-100/90">
              Working inside <span className="font-semibold">{orgId}</span>. Use the tabs above to switch between student rosters and reports.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-indigo-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-indigo-100/80">
              Select an institution to view cohorts, or onboard a new partner to unlock analytics.
            </div>
          )}
        </LayoutHero>
      </div>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(79,70,229,0.18)] dark:shadow-none">{children}</div>
      </Container>
    </div>
  );
};

export default InstitutionsLayout;
export { InstitutionsLayout };
    