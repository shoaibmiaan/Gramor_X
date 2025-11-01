// components/layouts/DashboardLayout.tsx
import * as React from 'react';
import {
  Gauge,
  CalendarCheck2,
  Headphones,
  BookOpenCheck,
  PenLine,
  MicVocal,
  Sparkles,
  Flame,
  CalendarClock,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const DashboardLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center justify-between text-foreground">
        <Badge variant="accent">Weekly focus</Badge>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mutedText">On track</span>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/40 bg-background/80 text-xl font-semibold text-primary">
          68%
          <span className="pointer-events-none absolute inset-0 rounded-full border border-primary/20" aria-hidden />
        </div>
        <div className="space-y-2 text-sm text-mutedText">
          <p className="font-medium text-foreground">Band 7.5 journey · 68% complete</p>
          <p>Keep the streak alive to unlock the Saturday AI review session and premium drills.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4">
        <div className="rounded-xl border border-primary/20 bg-background/70 p-3 text-sm text-mutedText">
          <p className="font-semibold text-foreground">Next mock test</p>
          <p>Saturday · 10:00 AM</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-background/70 p-3 text-sm text-mutedText">
          <p className="font-semibold text-foreground">Weekly commitment</p>
          <p>3 lessons · 2 speaking drills</p>
        </div>
      </div>
    </>
  );

  const momentumCards = [
    {
      icon: <Flame className="h-5 w-5" />,
      title: 'Streak',
      value: '7 days',
      description: 'Stay on fire — complete a quick drill today to protect the streak.',
    },
    {
      icon: <CalendarClock className="h-5 w-5" />,
      title: 'Next session',
      value: 'Sat · 10:00',
      description: 'Mock test · Writing Task 2 with timed review enabled.',
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: 'Band progress',
      value: '6.8 → 7.5',
      description: 'You&apos;re 2 feedback cycles away from unlocking the premium band clinic.',
    },
  ];

  const focusTasks = [
    {
      title: 'Practice intro paragraphs',
      description: 'Draft two openings using the AI coach to tighten cohesion.',
    },
    {
      title: 'Review listening mistakes',
      description: 'Replay flagged audio questions from the last mock and add notes.',
    },
    {
      title: 'Record speaking sample',
      description: 'Upload a 2-minute response for targeted pronunciation feedback.',
    },
  ];

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
          <div className="space-y-8 text-foreground">
            <section className="grid gap-4 md:grid-cols-3">
              {momentumCards.map((card) => (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      {card.icon}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mutedText">{card.title}</span>
                  </div>
                  <div className="pt-4">
                    <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                    <p className="pt-2 text-sm text-mutedText">{card.description}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-border/60 bg-background/85 p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Focus board</p>
                  <h2 className="text-xl font-semibold text-foreground">Quick wins for today</h2>
                  <p className="text-sm text-mutedText">
                    Tackle these mini-milestones to keep your personalised plan perfectly calibrated.
                  </p>
                </div>
                <Button href="/study-plan" size="sm" variant="soft" tone="primary">
                  View full plan
                </Button>
              </div>

              <ul className="mt-5 space-y-4">
                {focusTasks.map((task) => (
                  <li key={task.title} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="text-xs text-mutedText">{task.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="space-y-6 text-base leading-relaxed">{children}</div>
          </div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
