// components/layouts/InstitutionsLayout.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import type { LayoutQuickNavItem } from '@/components/layouts/shared/LayoutQuickNav';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

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
      {/* Sticky sub-header for B2B */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <Container className="flex flex-col gap-3 py-4 pt-safe">
          <div className="space-y-1">
            <h1 className="font-slab text-h3">Institutions</h1>
            <p className="text-small text-mutedText">Manage cohorts, students, and reports for your academy.</p>
          </div>
          <LayoutQuickNav
            ariaLabel="Institution sections"
            items={navItems}
          />
        </Container>
      </div>

      <Container className="py-6">
        <div className="card-surface rounded-ds-2xl p-4">{children}</div>
      </Container>
    </div>
  );
};

export default InstitutionsLayout;
export { InstitutionsLayout };
    