// components/layouts/DashboardLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';

/**
 * DashboardLayout
 * - DS tokens only (no hex)
 * - Context header + quick section nav
 * - Body wraps children in a card surface
 */
const DashboardLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();
  const itemClass = (active: boolean) =>
    `nav-pill shrink-0 whitespace-nowrap ${active ? 'bg-primary/10 text-primary' : ''}`;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Context header */}
      <section className="border-b border-border bg-card/40">
        <Container className="flex flex-col gap-4 py-5 pt-safe sm:py-6">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Your Dashboard</h1>
            <p className="text-small text-mutedText">
              Track progress, follow your plan, and jump back into modules.
            </p>
          </div>

          {/* Quick section nav (DS helper .nav-pill) */}
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1"
            aria-label="Dashboard quick links"
          >
            <div className="flex gap-2 px-1">
              <Link href="/study-plan" className={itemClass(pathname.startsWith('/study-plan'))}>
                Study Plan
              </Link>
              <Link href="/progress" className={itemClass(pathname.startsWith('/progress'))}>
                Analytics
              </Link>
              <Link href="/listening" className={itemClass(pathname.startsWith('/listening'))}>
                Listening
              </Link>
              <Link href="/reading" className={itemClass(pathname.startsWith('/reading'))}>
                Reading
              </Link>
              <Link href="/writing" className={itemClass(pathname.startsWith('/writing'))}>
                Writing
              </Link>
              <Link href="/speaking/simulator" className={itemClass(pathname.startsWith('/speaking'))}>
                Speaking
              </Link>
              <Link href="/pricing" className={itemClass(pathname.startsWith('/pricing'))}>
                Upgrade
              </Link>
            </div>
          </nav>
        </Container>
      </section>

      {/* Page body */}
      <Container className="py-5 sm:py-6">
        <div className="card-surface rounded-ds-2xl p-3 sm:p-4">
          {children}
        </div>
      </Container>
    </div>
  );
};

export default DashboardLayout;
/** also export named, so either import style works */
export { DashboardLayout };
