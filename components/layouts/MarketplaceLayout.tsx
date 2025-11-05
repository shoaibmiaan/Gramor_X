// components/layouts/MarketplaceLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { flags } from '@/lib/flags';

const coachEnabled = flags.enabled('coach');

const MarketplaceLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <LayoutHero
        accent="marketplace"
        icon={ShoppingBag}
        eyebrow="Marketplace"
        title="Coaches & Classes"
        subtitle={
          coachEnabled
            ? 'Meet IELTS experts, explore curated classes, and stay on top of upcoming sessions.'
            : 'Discover immersive classes and manage bookings while our coaching roster gets ready.'
        }
        actions={
          <Button asChild variant="soft" tone="success" elevateOnHover>
            <Link href="/partners">Become a partner</Link>
          </Button>
        }
        quickNav={{
          ariaLabel: 'Marketplace sections',
          items: [
            { href: '/marketplace', label: 'Marketplace' },
            { href: '/coach', label: 'Coaches', hidden: !coachEnabled },
            { href: '/classes', label: 'Classes' },
            { href: '/bookings', label: 'Bookings' },
            { href: '/partners', label: 'Partners' },
          ],
        }}
      >
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-cyan-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-cyan-100/90">
          Weekly live intensives and small-group workshops refresh every Monday.
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-cyan-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-cyan-100/80">
          {coachEnabled
            ? 'Tip: filter by availability to find the next open coaching slot.'
            : 'Coaching waitlist is open—join to get notified when experts launch.'}
        </div>
      </LayoutHero>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(34,211,238,0.15)] dark:shadow-none">{children}</div>
      </Container>
    </div>
  );
};

export default MarketplaceLayout;
export { MarketplaceLayout };
