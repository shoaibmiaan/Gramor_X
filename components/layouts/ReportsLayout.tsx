// components/layouts/ReportsLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const ReportsLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <section className="border-b border-border bg-card/30">
        <Container className="flex flex-col gap-4 py-5 pt-safe sm:py-6">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Reports & Analytics</h1>
            <p className="text-small text-mutedText">
              Deep insights into bands, trends, and performance.
            </p>
          </div>
          <LayoutQuickNav
            ariaLabel="Reports sections"
            items={[
              { href: '/reports/band-analytics', label: 'Band Analytics' },
              { href: '/placement', label: 'Placement Test' },
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

export default ReportsLayout;
export { ReportsLayout };
