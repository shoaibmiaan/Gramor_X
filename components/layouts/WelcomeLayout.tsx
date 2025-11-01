// components/layouts/WelcomeLayout.tsx
import * as React from 'react';
import {
  Sparkles,
  PartyPopper,
  UserCheck,
  CalendarCheck2,
  BookOpenCheck,
  Target,
  Gauge,
  Compass,
  MessageCircle,
} from 'lucide-react';

import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const WelcomeLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center justify-between text-foreground">
        <Badge variant="primary">Onboarding</Badge>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mutedText">Step 3 of 4</span>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sunsetOrange/40 bg-background/80 text-lg font-semibold text-sunsetOrange">
          72%
        </div>
        <div className="space-y-2 text-sm text-mutedText">
          <p className="font-medium text-foreground">You&apos;re almost ready to launch.</p>
          <p>
            Complete your profile and confirm your study plan to unlock personalised AI drills and weekly feedback.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4">
        <div className="rounded-xl border border-border/60 bg-background/70 p-3">
          <p className="text-caption uppercase tracking-wide text-mutedText">Next action</p>
          <p className="text-sm font-semibold text-foreground">Finish profile setup</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/70 p-3">
          <p className="text-caption uppercase tracking-wide text-mutedText">Reward</p>
          <p className="text-sm font-semibold text-foreground">Unlock AI feedback tokens</p>
        </div>
      </div>
    </>
  );

  const orientationCards = [
    {
      icon: <Compass className="h-5 w-5" />,
      title: 'Explore your plan',
      description: 'Review the guided checklist to lock in a sustainable weekly rhythm.',
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: 'Try the AI coach',
      description: 'Warm up with instant writing and speaking feedback before your first mock.',
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: 'Meet the community',
      description: 'Join discussion rooms and peer reviews tailored to your current band.',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-sunsetOrange/10 via-background to-background text-foreground">
      <LayoutHero
        accent="welcome"
        eyebrow="Welcome to GramorX"
        title="Let&apos;s personalise your IELTS journey"
        description="A short checklist to tailor lessons, automate reminders, and get you practising with confidence."
        actions={(
          <>
            <Button href="/profile/setup" size="lg">
              Complete profile
            </Button>
            <Button href="/dashboard" variant="soft" tone="primary" size="lg">
              Jump to dashboard
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Welcome navigation"
          items={[
            { href: '/welcome', label: 'Overview', icon: <PartyPopper className="h-4 w-4" /> },
            { href: '/profile/setup', label: 'Profile setup', icon: <UserCheck className="h-4 w-4" /> },
            { href: '/study-plan', label: 'Study plan', icon: <CalendarCheck2 className="h-4 w-4" /> },
            { href: '/learning', label: 'First lesson', icon: <BookOpenCheck className="h-4 w-4" /> },
            { href: '/mock-tests', label: 'Mock test', icon: <Target className="h-4 w-4" /> },
            { href: '/dashboard', label: 'Dashboard', icon: <Gauge className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="welcome">
          <div className="space-y-8 text-base leading-relaxed text-foreground">
            <section className="grid gap-4 md:grid-cols-3">
              {orientationCards.map((card) => (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sunsetOrange/15 text-sunsetOrange">
                      {card.icon}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{card.title}</p>
                      <p className="text-xs text-mutedText">{card.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <div className="space-y-6">{children}</div>
          </div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default WelcomeLayout;
export { WelcomeLayout };
