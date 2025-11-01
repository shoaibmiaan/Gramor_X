// components/layouts/PublicMarketingLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';

/**
 * PublicMarketingLayout
 * - Lightweight section wrapper for public pages (/, /pricing, /predictor, /faq, /legal, /data-deletion)
 * - Uses DS tokens only; header/footer come from global <Layout />
 * - Shows a small quick-nav for common marketing routes
 */
const PublicMarketingLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();

  const Item: React.FC<{ href: string; label: string }> = ({ href, label }) => {
    const active =
      pathname === href ||
      (href !== '/' && pathname.startsWith(href));
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
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1"
            aria-label="Marketing sections"
          >
            <div className="flex gap-2 px-1">
              <Item href="/" label="Home" />
              <Item href="/pricing" label="Pricing" />
              <Item href="/predictor" label="Band Predictor" />
              <Item href="/faq" label="FAQ" />
              <Item href="/legal/terms" label="Terms" />
              <Item href="/legal/privacy" label="Privacy" />
            </div>
          </nav>
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
