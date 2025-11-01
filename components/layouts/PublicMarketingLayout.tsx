// components/layouts/PublicMarketingLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

/**
 * PublicMarketingLayout
 * - Lightweight section wrapper for public pages (/, /pricing, /predictor, /faq, /legal, /data-deletion)
 * - Uses DS tokens only; header/footer come from global <Layout />
 * - Shows a small quick-nav for common marketing routes
 */
const PublicMarketingLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <LayoutHero
        accent="marketing"
        icon={Sparkles}
        eyebrow="Explore GramorX"
        title="Welcome"
        subtitle="Discover the full IELTS toolkit, preview premium lessons, and see how our predictor accelerates your band gains."
        actions={
          <Button asChild variant="soft" tone="info" elevateOnHover>
            <Link href="/signup">Start free trial</Link>
          </Button>
        }
        quickNav={{
          ariaLabel: 'Marketing sections',
          items: [
            { href: '/', label: 'Home', isActive: (path) => path === '/' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/predictor', label: 'Band Predictor' },
            { href: '/faq', label: 'FAQ' },
            { href: '/legal/terms', label: 'Terms' },
            { href: '/legal/privacy', label: 'Privacy' },
          ],
        }}
      >
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm font-medium text-sky-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
          Trusted by thousands of IELTS aspirants upgrading their band scores every month.
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/60 p-4 text-sm text-sky-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-sky-100/90">
          New: AI Band Predictor now simulates speaking and writing feedback in seconds.
        </div>
      </LayoutHero>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(56,189,248,0.15)] dark:shadow-none">
          {children}
        </div>
      </Container>
    </div>
  );
};

export default PublicMarketingLayout;
export { PublicMarketingLayout };
