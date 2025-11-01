// components/layouts/PublicMarketingLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

/**
 * PublicMarketingLayout
 * - Lightweight section wrapper for public pages (/, /pricing, /predictor, /faq, /legal, /data-deletion)
 * - Uses DS tokens only; header/footer come from global <Layout />
 * - Shows a small quick-nav for common marketing routes
 */
const PublicMarketingLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Context header */}
      <section className="border-b border-border bg-card/30">
        <Container className="flex flex-col gap-4 py-6 pt-safe sm:py-7">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Welcome</h1>
            <p className="text-small text-mutedText">
              Explore plans, try the predictor, and learn how GramorX boosts your IELTS score.
            </p>
          </div>

          {/* Quick marketing nav */}
          <LayoutQuickNav
            ariaLabel="Marketing sections"
            items={[
              { href: '/', label: 'Home', isActive: (path) => path === '/' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/predictor', label: 'Band Predictor' },
              { href: '/faq', label: 'FAQ' },
              { href: '/legal/terms', label: 'Terms' },
              { href: '/legal/privacy', label: 'Privacy' },
            ]}
          />
        </Container>
      </section>

      {/* Page body */}
      <Container className="py-6">
        <div className="card-surface rounded-ds-2xl p-4">
          {children}
        </div>
      </Container>
    </div>
  );
};

export default PublicMarketingLayout;
export { PublicMarketingLayout };
