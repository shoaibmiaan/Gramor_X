// components/layouts/MarketplaceLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { flags } from '@/lib/flags';

const coachEnabled = flags.enabled('coach');

const MarketplaceLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
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

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <section className="border-b border-border bg-card/30">
        <Container className="flex flex-col gap-4 py-5 pt-safe sm:py-6">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Coaches & Classes</h1>
            <p className="text-small text-mutedText">
              {coachEnabled
                ? 'Find a coach, join a class, or manage bookings.'
                : 'Join a class or manage bookings while coaching launches soon.'}
            </p>
          </div>
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1"
            aria-label="Marketplace sections"
          >
            <div className="flex gap-2 px-1">
              <Item href="/marketplace" label="Marketplace" />
              {coachEnabled && <Item href="/coach" label="Coaches" />}
              <Item href="/classes" label="Classes" />
              <Item href="/bookings" label="Bookings" />
              <Item href="/partners" label="Partners" />
            </div>
          </nav>
        </Container>
      </section>

      <Container className="py-6">
        <div className="card-surface rounded-ds-2xl p-4">{children}</div>
      </Container>
    </div>
  );
};

export default MarketplaceLayout;
export { MarketplaceLayout };
