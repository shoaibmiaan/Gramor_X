// components/layouts/PublicMarketingLayout.tsx
import * as React from 'react';
import { Home, BadgeDollarSign, Sparkles, HelpCircle, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const PublicMarketingLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="primary">IELTS Ready</Badge>
        <span className="text-sm font-semibold">12k+ learners onboard</span>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3">
        <div className="rounded-xl bg-background/70 p-3 shadow-sm">
          <p className="text-caption uppercase tracking-wide text-mutedText">Avg. band boost</p>
          <p className="text-2xl font-bold text-gradient-primary">+1.2</p>
        </div>
        <div className="rounded-xl bg-background/70 p-3 shadow-sm">
          <p className="text-caption uppercase tracking-wide text-mutedText">Satisfaction</p>
          <p className="text-2xl font-bold text-gradient-primary">96%</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-vibrantPurple/5 via-background to-background text-foreground">
      <LayoutHero
        accent="marketing"
        eyebrow="Discover GramorX"
        title="Your IELTS companion for confident band 8+ journeys"
        description="Compare plans, explore features, and see how GramorX accelerates language mastery for ambitious learners."
        actions={(
          <>
            <Button href="/pricing" size="lg">
              View pricing
            </Button>
            <Button href="/predictor" variant="soft" tone="accent" size="lg">
              Try the band predictor
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Marketing sections"
          items={[
            { href: '/', label: 'Home', icon: <Home className="h-4 w-4" /> },
            { href: '/pricing', label: 'Pricing', icon: <BadgeDollarSign className="h-4 w-4" /> },
            { href: '/predictor', label: 'Band Predictor', icon: <Sparkles className="h-4 w-4" /> },
            { href: '/faq', label: 'FAQ', icon: <HelpCircle className="h-4 w-4" /> },
            { href: '/legal/terms', label: 'Terms', icon: <FileText className="h-4 w-4" /> },
            { href: '/legal/privacy', label: 'Privacy', icon: <ShieldCheck className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="marketing">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default PublicMarketingLayout;
export { PublicMarketingLayout };
