// components/layouts/MarketplaceLayout.tsx
import * as React from 'react';
import { Store, UsersRound, CalendarClock, BriefcaseBusiness, Building2 } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { flags } from '@/lib/flags';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const coachEnabled = flags.enabled('coach');

const MarketplaceLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="warning">Featured</Badge>
        <span className="text-sm font-medium">Weekend strategy sprint · seats left: 4</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Upcoming sessions</span>
          <span className="text-2xl font-bold text-gradient-primary">12</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Average coach rating</span>
          <span className="text-sm font-semibold">4.9 / 5</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-goldenYellow/10 via-background to-background text-foreground">
      <LayoutHero
        accent="marketplace"
        eyebrow="Coaches & Classes"
        title="Book expert feedback, join live classes, and grow faster"
        description={
          coachEnabled
            ? 'Find a coach, secure your spot in upcoming cohorts, or manage your existing bookings.'
            : 'Browse classes, manage bookings, and prepare for personalised coaching as it launches.'
        }
        actions={(
          <>
            <Button href="/marketplace" size="lg">
              Explore marketplace
            </Button>
            <Button href="/bookings" variant="soft" tone="warning" size="lg">
              Manage bookings
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Marketplace sections"
          items={[
            { href: '/marketplace', label: 'Marketplace', icon: <Store className="h-4 w-4" /> },
            { href: '/coach', label: 'Coaches', icon: <UsersRound className="h-4 w-4" />, hidden: !coachEnabled },
            { href: '/classes', label: 'Classes', icon: <CalendarClock className="h-4 w-4" /> },
            { href: '/bookings', label: 'Bookings', icon: <BriefcaseBusiness className="h-4 w-4" /> },
            { href: '/partners', label: 'Partners', icon: <Building2 className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="marketplace">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default MarketplaceLayout;
export { MarketplaceLayout };
