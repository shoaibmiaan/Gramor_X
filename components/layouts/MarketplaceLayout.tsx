// components/layouts/MarketplaceLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';
import { flags } from '@/lib/flags';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const coachEnabled = flags.enabled('coach');

const MarketplaceLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
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
          <LayoutQuickNav
            ariaLabel="Marketplace sections"
            items={[
              { href: '/marketplace', label: 'Marketplace' },
              { href: '/coach', label: 'Coaches', hidden: !coachEnabled },
              { href: '/classes', label: 'Classes' },
              { href: '/bookings', label: 'Bookings' },
              { href: '/partners', label: 'Partners' },
            ]}
          />
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
