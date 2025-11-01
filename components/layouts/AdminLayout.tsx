// components/layouts/AdminLayout.tsx
import * as React from 'react';
import { ShieldCheck, Users2, Star, BookOpenCheck, FileStack, GraduationCap } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import {
  LayoutQuickNav,
  LayoutQuickNavItem,
} from '@/components/layouts/shared/LayoutQuickNav';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';

const AdminLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navItems: LayoutQuickNavItem[] = [
    { href: '/admin', label: 'Admin Overview', icon: <ShieldCheck className="h-4 w-4" /> },
    { href: '/admin/partners', label: 'Partners', icon: <Users2 className="h-4 w-4" /> },
    { href: '/admin/students', label: 'Students', icon: <GraduationCap className="h-4 w-4" /> },
    { href: '/admin/reviews', label: 'Reviews', icon: <Star className="h-4 w-4" /> },
    { href: '/admin/reading', label: 'Reading Builder', icon: <BookOpenCheck className="h-4 w-4" /> },
    { href: '/admin/content/reading', label: 'Content', icon: <FileStack className="h-4 w-4" /> },
    { href: '/teacher', label: 'Teacher Home', icon: <GraduationCap className="h-4 w-4" />, activeClassName: 'is-active border-transparent bg-accent/20 text-accent ring-1 ring-accent/30 shadow-md' },
    { href: '/teacher/cohorts', label: 'Cohorts', icon: <Users2 className="h-4 w-4" />, activeClassName: 'is-active border-transparent bg-accent/20 text-accent ring-1 ring-accent/30 shadow-md' },
  ];

  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="primary">Ops status</Badge>
        <span className="text-sm font-medium">All services operational</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Pending approvals</span>
          <span className="text-xl font-semibold text-gradient-primary">8</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Unassigned reviews</span>
          <span className="text-sm font-semibold">3 essays</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primaryDark/20 via-background to-background text-foreground">
      <LayoutHero
        accent="admin"
        eyebrow="Admin & Teacher Console"
        title="Oversee partners, manage cohorts, and keep content fresh"
        description="Stay ahead of approvals, surface at-risk learners, and update lesson libraries with confidence."
        actions={(
          <>
            <Button href="/admin/reports" size="lg">
              Open admin reports
            </Button>
            <Button href="/teacher" variant="soft" tone="primary" size="lg">
              Switch to teacher view
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Admin and teacher sections"
          items={navItems}
          defaultActiveClassName="is-active border-transparent bg-primary/20 text-primary ring-1 ring-primary/30 shadow-md"
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="admin">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default AdminLayout;
export { AdminLayout };
