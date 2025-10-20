// components/layouts/InstitutionsLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';

const InstitutionsLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();

  const Item = ({ href, label }: { href: string; label: string }) => {
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

  // Derive org context (best-effort) for quick links
  const match = pathname.match(/^\/institutions\/([^/]+)/);
  const orgId = match?.[1];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Sticky sub-header for B2B */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <Container className="flex flex-col gap-3 py-4 pt-safe">
          <div className="space-y-1">
            <h1 className="font-slab text-h3">Institutions</h1>
            <p className="text-small text-mutedText">Manage cohorts, students, and reports for your academy.</p>
          </div>
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1"
            aria-label="Institution sections"
          >
            <div className="flex gap-2 px-1">
              <Item href="/institutions" label="All Orgs" />
              {orgId ? (
                <>
                  <Item href={`/institutions/${orgId}`} label="Overview" />
                  <Item href={`/institutions/${orgId}/students`} label="Students" />
                  <Item href={`/institutions/${orgId}/reports`} label="Reports" />
                </>
              ) : null}
            </div>
          </nav>
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
    