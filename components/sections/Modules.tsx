// components/sections/Modules.tsx
import { Icon } from '@/components/design-system/Icon';
import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { useUserContext } from '@/context/UserContext';

type Item = {
  status: 'Live' | 'Beta';
  statusVariant: 'success' | 'info';
  icon: string;
  title: string;
  subtitle: string;
  bullets: string[];
  href?: string;
  requiresAuth?: boolean;
};

const items: Item[] = [
  {
    status: 'Live',
    statusVariant: 'success',
    icon: 'BookMarked',
    title: 'Vocabulary explorer',
    subtitle: 'Search IELTS-ready words with CEFR, category, and synonym filters.',
    bullets: ['Guest preview available', 'Unlock saves & drills after signup'],
    href: '/vocabulary',
    requiresAuth: true,
  },
  {
    status: 'Live',
    statusVariant: 'success',
    icon: 'Headphones',
    title: 'Listening labs',
    subtitle: 'Spot traps fast with guided transcripts.',
    bullets: ['Band playlists', 'Instant transcript reveal'],
    href: '/listening',
  },
  {
    status: 'Live',
    statusVariant: 'success',
    icon: 'BookOpen',
    title: 'Reading vault',
    subtitle: 'Scan smarter with short decoding drills.',
    bullets: ['Cambridge-style passages', 'Trap decoders'],
    href: '/reading',
  },
  {
    status: 'Beta',
    statusVariant: 'info',
    icon: 'PenSquare',
    title: 'Writing studio',
    subtitle: 'Build answers with AI outlines and rubrics.',
    bullets: ['Task visuals annotated', 'Band-based scoring'],
    href: '/writing',
  },
  {
    status: 'Live',
    statusVariant: 'success',
    icon: 'Mic',
    title: 'Speaking partner',
    subtitle: 'Run full interviews with instant transcripts.',
    bullets: ['Timed prompts', 'Accent & pacing notes'],
    href: '/speaking',
  },
  {
    status: 'Beta',
    statusVariant: 'info',
    icon: 'ClipboardList',
    title: 'Mock exam center',
    subtitle: 'Full mocks with score projections.',
    bullets: ['Exam-day interface', 'Band predictor reports'],
    href: '/mock',
  },
  {
    status: 'Live',
    statusVariant: 'success',
    icon: 'BarChart3',
    title: 'Performance intelligence',
    subtitle: 'Know what to fix next, without guessing.',
    bullets: ['Weak skill spotlight', 'Goal-led plan'],
    href: '/progress',
  },
];

export const Modules: React.FC = () => {
  const { role } = useUserContext();
  const isGuest = !role || role === 'guest';

  return (
    <Section id="modules">
      <Container>
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="Sparkles" className="text-electricBlue" />
            End-to-end IELTS journey
          </Badge>
          <h2 className="font-slab text-display mb-3 text-gradient-primary">All the key rooms, one platform</h2>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Jump into focused drills without juggling apps.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((module) => (
            <Card
              key={module.title}
              className="relative h-full border-border/60 bg-white/70 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-glow dark:bg-dark/70"
              interactive
              padding="lg"
            >
              <Badge
                variant={module.statusVariant}
                size="sm"
                className="absolute right-5 top-5 flex items-center gap-2 px-3 py-1"
              >
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                {module.status}
              </Badge>

              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-electricBlue to-purpleVibe text-white">
                <Icon name={module.icon} size={28} />
              </div>

              <h3 className="text-2xl font-semibold text-foreground">{module.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{module.subtitle}</p>

              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {module.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-electricBlue/15 text-electricBlue">
                      <Icon name="Check" size={14} />
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {module.href && (
                <div className="mt-6">
                  {(() => {
                    const normalizedHref = module.href?.startsWith('/') ? module.href : `/${module.href ?? ''}`;
                    const href =
                      module.requiresAuth && isGuest && normalizedHref
                        ? `/signup?${new URLSearchParams({ next: normalizedHref }).toString()}`
                        : normalizedHref;
                    const label =
                      module.requiresAuth && isGuest
                        ? 'Sign up to explore'
                        : `Explore ${module.title.toLowerCase()}`;

                    return (
                      <Link
                        href={href || '#'}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-electricBlue hover:text-electricBlue/80"
                      >
                        {label} <Icon name="ArrowRight" size={18} />
                      </Link>
                    );
                  })()}
                </div>
              )}
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
};

export default Modules;
