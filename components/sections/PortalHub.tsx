// components/sections/PortalHub.tsx
import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon, { type IconName } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';

type QuickLink = {
  label: string;
  description: string;
  href: string;
  icon: IconName;
  tag?: string;
};

const quickLinks: QuickLink[] = [
  {
    label: 'Dashboard',
    description: 'See streaks, tasks, and your band trajectory.',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    tag: 'Start here',
  },
  {
    label: 'Finish onboarding',
    description: 'Lock in goal band, exam date, and study rhythm.',
    href: '/profile/setup',
    icon: 'ClipboardCheck',
  },
  {
    label: 'Writing workspace',
    description: 'Practice Task 1 & Task 2 with AI feedback.',
    href: '/writing',
    icon: 'PenSquare',
  },
  {
    label: 'Reading drills',
    description: 'Short timed practice with explanations.',
    href: '/reading',
    icon: 'FileText',
  },
  {
    label: 'Listening hub',
    description: 'Playlists, practice sets, and exam-style tasks.',
    href: '/listening',
    icon: 'Headphones',
  },
  {
    label: 'Speaking practice',
    description: 'Record answers and get AI speaking insights.',
    href: '/speaking',
    icon: 'Mic2',
  },
  {
    label: 'Vocabulary Lab',
    description: 'Topic-wise vocab packs for IELTS contexts.',
    href: '/vocabulary',
    icon: 'BookMarked',
  },
  {
    label: 'Pricing & plans',
    description: 'Free vs Rocket vs institutional options.',
    href: '/pricing',
    icon: 'CreditCard',
  },
];

const PortalHub: React.FC = () => {
  return (
    <Container>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p
            id="portal-hub-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            Portal hub
          </p>
          <h2 className="font-slab text-2xl md:text-3xl text-foreground">
            One page to jump anywhere in GramorX.
          </h2>
          <p className="mt-1 max-w-xl text-xs md:text-sm text-muted-foreground">
            Use this section as your control panel: dashboard, modules, AI Lab, onboarding,
            billing — all one tap away.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <Badge variant="neutral" size="sm">
            All key links live here
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((item) => (
          <Card
            key={item.href}
            interactive
            className="group flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-surface/90"
          >
            <Link href={item.href} className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name={item.icon} size={18} />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    {item.tag ? (
                      <span className="rounded-full bg-primary/5 px-2 py-[2px] text-[10px] font-medium text-primary">
                        {item.tag}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-primary">
                <span className="inline-flex items-center gap-1 font-medium group-hover:underline">
                  Open
                  <Icon name="ArrowRight" size={14} />
                </span>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Icon name="Info" size={12} /> This hub is the single source of navigation for
          learners and teachers.
        </span>
        <span>•</span>
        <span>Use your dashboard for daily flow, use this hub for exploration.</span>
      </div>
    </Container>
  );
};

export default PortalHub;
