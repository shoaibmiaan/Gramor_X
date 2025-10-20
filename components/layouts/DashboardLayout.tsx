// components/layouts/DashboardLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';

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
  const { pathname } = useRouter();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border bg-card/30">
        <Container className="space-y-4 py-6 pt-safe">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Your Dashboard</h1>
            <p className="text-small text-mutedText">
              Track progress, follow your plan, and jump back into modules.
            </p>
          </div>

          <nav
            aria-label="Dashboard quick links"
            className="flex flex-wrap gap-3 text-sm text-muted-foreground"
          >
            {QUICK_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-2 py-1 transition hover:text-foreground ${
                    active ? 'bg-muted text-foreground' : ''
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </Container>
      </header>

      <main>
        <Container className="py-8 sm:py-10">{children}</Container>
      </main>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
