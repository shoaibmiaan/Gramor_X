// components/layouts/DashboardLayout.tsx
import * as React from 'react';
import { Gauge, CalendarCheck2, Headphones, BookOpenCheck, PenLine, MicVocal, Sparkles } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const DashboardLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="accent">Weekly focus</Badge>
        <span className="text-sm font-medium">Writing Task 2 · 3 lessons left</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Study streak</span>
          <span className="text-2xl font-bold text-gradient-accent">7 days</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Next mock test</span>
          <span className="text-sm font-semibold">Saturday · 10:00 AM</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Band goal</span>
          <span className="text-sm font-semibold">Target 7.5 · 68% complete</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <LayoutHero
        accent="dashboard"
        eyebrow="Student HQ"
        title="Track progress, keep momentum, and own your IELTS plan"
        description="Jump straight into your next session, review analytics, or fine-tune the personalised schedule we built for you."
        actions={(
          <>
            <Button href="/study-plan" size="lg">
              Open study plan
            </Button>
            <Button href="/pricing" variant="soft" tone="primary" size="lg">
              Unlock premium drills
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Dashboard quick links"
          items={[
            { href: '/dashboard', label: 'Overview', icon: <Gauge className="h-4 w-4" /> },
            { href: '/study-plan', label: 'Study Plan', icon: <CalendarCheck2 className="h-4 w-4" /> },
            { href: '/progress', label: 'Analytics', icon: <Sparkles className="h-4 w-4" /> },
            { href: '/listening', label: 'Listening', icon: <Headphones className="h-4 w-4" /> },
            { href: '/reading', label: 'Reading', icon: <BookOpenCheck className="h-4 w-4" /> },
            { href: '/writing', label: 'Writing', icon: <PenLine className="h-4 w-4" /> },
            { href: '/speaking/simulator', label: 'Speaking', icon: <MicVocal className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="dashboard">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
