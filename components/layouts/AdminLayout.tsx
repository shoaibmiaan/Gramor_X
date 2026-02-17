// components/layouts/AdminLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';

/**
 * AdminLayout
 * - Shared shell for /admin and /teacher consoles (keeps global header/footer from <Layout />)
 * - Sticky sub-nav with active state; DS tokens only
 * - Place main content in a card surface
 */
const AdminLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();

  const AdminItem: React.FC<{ href: string; label: string }> = ({ href, label }) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`nav-pill shrink-0 whitespace-nowrap ${active ? 'bg-primary/10 text-primary' : ''}`}
      >
        {label}
      </Link>
    );
  };

  const TeacherItem: React.FC<{ href: string; label: string }> = ({ href, label }) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`nav-pill shrink-0 whitespace-nowrap ${active ? 'bg-accent/10 text-accent' : ''}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Sticky sub-header */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <Container className="flex flex-col gap-3 py-3 pt-safe">
          <div className="space-y-1">
            <h1 className="font-slab text-h3">Admin & Teacher Console</h1>
            <p className="text-small text-mutedText">Manage partners, students, reviews, and cohorts.</p>
          </div>

          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1"
            aria-label="Admin and teacher sections"
          >
            <div className="flex gap-2 px-1">
              {/* Admin */}
              <AdminItem href="/admin" label="Admin Overview" />
              <AdminItem href="/admin/partners" label="Partners" />
              <AdminItem href="/admin/students" label="Students" />
              <AdminItem href="/admin/reviews" label="Reviews" />
              <AdminItem href="/admin/reading" label="Reading Builder" />
              <AdminItem href="/admin/content/reading" label="Content" />

              {/* Teacher */}
              <TeacherItem href="/teacher" label="Teacher Home" />
              <TeacherItem href="/teacher/cohorts" label="Cohorts" />
            </div>
          </nav>
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
