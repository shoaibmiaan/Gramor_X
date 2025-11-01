// components/layouts/LearningLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const LearningLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <section className="border-b border-border bg-card/30">
        <Container className="flex flex-col gap-4 py-5 pt-safe sm:py-6">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Learning & Studio</h1>
            <p className="text-small text-mutedText">
              Lessons, drills, strategies — and your content studio.
            </p>
          </div>
          <LayoutQuickNav
            ariaLabel="Learning sections"
            items={[
              { href: '/learning', label: 'Overview' },
              { href: '/learning/skills', label: 'Skills' },
              { href: '/learning/skills/lessons', label: 'Lessons' },
              { href: '/learning/strategies', label: 'Strategies' },
              { href: '/content/studio', label: 'Studio' },
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

export default LearningLayout;
export { LearningLayout };
