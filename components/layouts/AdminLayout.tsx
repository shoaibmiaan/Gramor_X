// components/layouts/AdminLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';
import {
  LayoutQuickNav,
  LayoutQuickNavItem,
} from '@/components/layouts/shared/LayoutQuickNav';

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
      {/* Sticky sub-header */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <Container className="flex flex-col gap-3 py-3 pt-safe">
          <div className="space-y-1">
            <h1 className="font-slab text-h3">Admin & Teacher Console</h1>
            <p className="text-small text-mutedText">Manage partners, students, reviews, and cohorts.</p>
          </div>

          <LayoutQuickNav
            ariaLabel="Admin and teacher sections"
            items={navItems}
            defaultActiveClassName="bg-primary/10 text-primary"
          />
        </Container>
      </div>

      {/* Body */}
      <Container className="py-6">
        <div className="card-surface rounded-ds-2xl p-4">
          {children}
        </div>
      </Container>
    </div>
  );
};

export default AdminLayout;
export { AdminLayout };
