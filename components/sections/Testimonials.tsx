// components/sections/Testimonials.tsx
import React from 'react';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

export type Testimonial = {
  id: string;
  name: string;
  band: string;
  quote: string;
  context: 'Academic' | 'General Training';
  location?: string;
  improvement: string;
  modules: string[];
};

const testimonials: readonly Testimonial[] = [
  {
    id: 't1',
    name: 'Hina S.',
    band: '7.5',
    quote: 'Task 2 feedback called out cohesion gaps in plain language.',
    context: 'Academic',
    location: 'Lahore, PK',
    improvement: '+1.0 band in writing',
    modules: ['Writing studio', 'Performance intelligence', 'Mock exam center'],
  },
  {
    id: 't2',
    name: 'Umair R.',
    band: '8.0',
    quote: 'Speaking drills felt like the real thing and the transcript flagged every filler word.',
    context: 'General Training',
    location: 'Dubai, UAE',
    improvement: 'From 7.0 → 8.0 overall',
    modules: ['Speaking partner', 'Listening labs'],
  },
  {
    id: 't3',
    name: 'Ayesha T.',
    band: '7.0',
    quote: 'The reading vault finally made True/False predictable and my timing steadied.',
    context: 'Academic',
    location: 'Islamabad, PK',
    improvement: 'Consistent 8.5 reading section',
    modules: ['Reading vault', 'Adaptive plan'],
  },
];

const proofPoints = [
  {
    icon: 'TrendingUp',
    label: '1.5 band average lift',
    description: 'Based on 1,400 learners who stayed on the adaptive path for 6+ weeks.',
  },
  {
    icon: 'Clock',
    label: '92% stay on plan',
    description: 'Streak nudges keep learners showing up for micro sessions.',
  },
  {
    icon: 'Users',
    label: 'Mentors & AI in sync',
    description: 'AI notes match what teachers see, so coaching is faster.',
  },
] as const;

export const Testimonials: React.FC = () => {
  const [spotlight, ...rest] = testimonials;

  return (
    <Section id="testimonials">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="accent" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="Sparkles" size={16} className="text-electricBlue" />
            Results from real learners
          </Badge>
          <h2 className="font-slab text-display tracking-tight text-gradient-primary">Proof the system works</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Each journey kicked off with a quick diagnostic and tight feedback loop.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="relative overflow-hidden border border-electricBlue/30 bg-white/80 p-8 shadow-lg shadow-electricBlue/10 backdrop-blur dark:bg-dark/70">
            <div className="absolute inset-x-8 top-0 h-48 rounded-b-[3rem] bg-gradient-to-br from-electricBlue/40 via-purpleVibe/30 to-transparent blur-2xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground/80">Spotlight learner</p>
                  <h3 className="mt-1 text-3xl font-semibold text-foreground">{spotlight.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {spotlight.context}
                    {spotlight.location ? ` • ${spotlight.location}` : ''}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-neonGreen/80 to-electricBlue/80 px-5 py-3 text-center text-background shadow-lg">
                  <div className="text-xs uppercase tracking-wide text-white/70">Final score</div>
                  <div className="font-slab text-4xl font-semibold text-white">Band {spotlight.band}</div>
                  <div className="mt-1 text-xs font-medium text-white/80">{spotlight.improvement}</div>
                </div>
              </div>

              <blockquote className="relative rounded-3xl border border-border/60 bg-card/70 p-6 text-base text-foreground shadow-sm">
                <Icon name="Quote" className="absolute -top-5 left-6 h-10 w-10 text-electricBlue/30" aria-hidden="true" />
                <p className="relative z-10 leading-relaxed">“{spotlight.quote}”</p>
              </blockquote>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-electricBlue/30 bg-electricBlue/10 px-4 py-1 font-medium text-electricBlue">
                  <Icon name="Compass" size={16} /> Adaptive path
                </span>
                {spotlight.modules.map((m) => (
                  <span key={m} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium">
                    <Icon name="Check" size={14} aria-hidden="true" /> {m}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-6">
            {rest.map((t) => (
              <Card
                key={t.id}
                padding="lg"
                className="h-full border border-border/60 bg-white/70 transition hover:-translate-y-1 hover:border-electricBlue/40 hover:shadow-lg dark:bg-dark/70"
                interactive
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.context}
                      {t.location ? ` • ${t.location}` : ''}
                    </p>
                  </div>
                  <div className="rounded-full border border-electricBlue/30 bg-electricBlue/10 px-3 py-1 text-sm font-semibold text-electricBlue">
                    Band {t.band}
                  </div>
                </div>

                <blockquote className="mt-4 border-l-4 border-electricBlue/30 pl-4 text-sm text-muted-foreground">
                  “{t.quote}”
                </blockquote>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/90">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-3 py-1 font-medium text-foreground">
                    <Icon name="ArrowUp" size={14} /> {t.improvement}
                  </span>
                  {t.modules.map((module) => (
                    <span key={module} className="inline-flex items-center gap-1 rounded-full border border-border/40 px-3 py-1">
                      <Icon name="Sparkles" size={12} aria-hidden="true" /> {module}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {proofPoints.map((point) => (
            <Card key={point.label} className="h-full border border-border/60 bg-background/80 p-6 text-left shadow-sm backdrop-blur">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-electricBlue/10 text-electricBlue">
                <Icon name={point.icon} size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{point.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{point.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Hear more journeys</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              href="/stories"
              variant="primary"
              className="rounded-full px-6 shadow-md shadow-electricBlue/20 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Icon name="Play" size={18} /> Watch stories
            </Button>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-electricBlue transition hover:border-electricBlue/40 hover:text-electricBlue/80"
            >
              Read more reviews <Icon name="ArrowRight" size={16} />
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
};

export default Testimonials;
