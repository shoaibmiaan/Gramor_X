// components/layouts/LearningLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

const LearningLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <LayoutHero
        accent="learning"
        icon={GraduationCap}
        eyebrow="Learning Studio"
        title="Lessons & Strategies"
        subtitle="Move through guided lessons, unlock drills, and create your own study content with the studio."
        actions={
          <Button asChild variant="soft" tone="warning" elevateOnHover>
            <Link href="/study-plan">View study plan</Link>
          </Button>
        }
        quickNav={{
          ariaLabel: 'Learning sections',
          items: [
            { href: '/learning', label: 'Overview' },
            { href: '/learning/skills', label: 'Skills' },
            { href: '/learning/skills/lessons', label: 'Lessons' },
            { href: '/learning/strategies', label: 'Strategies' },
            { href: '/content/studio', label: 'Studio' },
          ],
        }}
      >
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-orange-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-amber-100/90">
          Continue where you left off in Speaking Fluency Drill set 4.
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-orange-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-amber-100/80">
          Studio tip: drop your prompts to auto-generate vocabulary lists and outlines.
        </div>
      </LayoutHero>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(251,191,36,0.18)] dark:shadow-none">{children}</div>
      </Container>
    </div>
  );
};

export default LearningLayout;
export { LearningLayout };
