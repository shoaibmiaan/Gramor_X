// components/layouts/InstitutionsLayout.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import { Building2, UsersRound, BarChart3 } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import type { LayoutQuickNavItem } from '@/components/layouts/shared/LayoutQuickNav';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const InstitutionsLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();

  const match = pathname.match(/^\/institutions\/([^/]+)/);
  const orgId = match?.[1];

  const navItems: LayoutQuickNavItem[] = [
    { href: '/institutions', label: 'All Orgs', icon: <Building2 className="h-4 w-4" /> },
  ];

  if (orgId) {
    navItems.push(
      { href: `/institutions/${orgId}`, label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
      { href: `/institutions/${orgId}/students`, label: 'Students', icon: <UsersRound className="h-4 w-4" /> },
      { href: `/institutions/${orgId}/reports`, label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
    );
  }

  const highlight = orgId ? (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="info">Organisation</Badge>
        <span className="text-sm font-medium">{orgId}</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Active cohorts</span>
          <span className="text-xl font-semibold text-gradient-primary">3</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Verified seats</span>
          <span className="text-sm font-semibold">142 students</span>
        </div>
      </div>
    </>
  ) : (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="secondary">Partner hub</Badge>
        <span className="text-sm font-medium">Manage onboarding and analytics</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Active organisations</span>
          <span className="text-xl font-semibold text-gradient-primary">12</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Pending invites</span>
          <span className="text-sm font-semibold">4 awaiting approval</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-electricBlue/10 via-background to-background text-foreground">
      <LayoutHero
        accent="institutions"
        eyebrow="Institutions"
        title="Coordinate cohorts, track progress, and empower partners"
        description="Give academies visibility into learner performance, manage enrolments, and keep onboarding flowing smoothly."
        actions={(
          <>
            <Button href="/institutions" size="lg">
              View organisations
            </Button>
            <Button href="/institutions/new" variant="soft" tone="info" size="lg">
              Invite institution
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav ariaLabel="Institution sections" items={navItems} />
      </LayoutHero>

      <main>
        <LayoutSurface accent="institutions">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default InstitutionsLayout;
export { InstitutionsLayout };
