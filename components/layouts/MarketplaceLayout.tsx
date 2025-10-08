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
        className={`nav-pill ${active ? 'bg-primary/10 text-primary' : ''}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card/30">
        <Container className="py-5 sm:py-6 pb-safe md:pb-0">
          <h1 className="font-slab text-h3 sm:text-h2">Coaches & Classes</h1>
          <p className="text-small text-mutedText mt-1">
            {coachEnabled
              ? 'Find a coach, join a class, or manage bookings.'
              : 'Join a class or manage bookings while coaching launches soon.'}
          </p>
          <nav className="mt-3 flex flex-wrap gap-2">
            <Item href="/marketplace" label="Marketplace" />
            {coachEnabled && <Item href="/coach" label="Coaches" />}
            <Item href="/classes" label="Classes" />
            <Item href="/bookings" label="Bookings" />
            <Item href="/partners" label="Partners" />
          </nav>
        </Container>
      </section>

      <Container className="py-6 pb-safe md:pb-0">
        <div className="card-surface rounded-ds-2xl p-4">{children}</div>
      </Container>
    </div>
  );
};

export default MarketplaceLayout;
export { MarketplaceLayout };
