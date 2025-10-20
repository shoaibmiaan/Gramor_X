import React from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';

const FEATURES = [
  {
    icon: 'BookOpen',
    title: 'Context-first prompts',
    blurb: 'Gap-fills and mini-cloze drills keep every word anchored in IELTS passages.',
  },
  {
    icon: 'Headphones',
    title: 'Listening on repeat',
    blurb: 'Native-paced audio pairs with cards so pronunciation sticks before you grade.',
  },
  {
    icon: 'PenSquare',
    title: 'Micro-writing coach',
    blurb: 'Two-sentence challenges flag awkward collocations and reward precise register.',
  },
  {
    icon: 'Mic',
    title: 'Speaking confidence',
    blurb: 'Record, compare, and store pronunciation attempts without leaving the flow.',
  },
] as const;

const METRICS = [
  { label: 'Exercises per word', value: '10+' },
  { label: 'Default review mix', value: '40 • 40 • 20' },
  { label: 'IELTS topics covered', value: '15+' },
] as const;

export function FourSkillSpotlight() {
  return (
    <section aria-labelledby="four-skill-spotlight" className="mt-12">
      <div className="relative overflow-hidden rounded-ds-2xl border border-border/60 bg-gradient-to-br from-purpleVibe/15 via-dark/80 to-electricBlue/20 text-white shadow-glow">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
          <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-purpleVibe/40 blur-3xl" />
          <div className="absolute bottom-0 right-[-3rem] h-80 w-80 rounded-full bg-electricBlue/30 blur-3xl" />
        </div>

        <div className="relative grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.6fr_1fr] lg:py-12">
          <div className="space-y-6">
            <Badge variant="subtle" size="sm" className="bg-white/15 text-white">
              Four-skill spotlight
            </Badge>
            <div className="space-y-3">
              <h2 id="four-skill-spotlight" className="font-slab text-h2 leading-tight text-white">
                A beautiful practice arc that keeps learners coming back
              </h2>
              <p className="max-w-2xl text-body text-white/85">
                We lead with context and collocations so every card moves you through reading, listening,
                speaking, and writing in minutes—not hours.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card
                  key={feature.title}
                  padding="lg"
                  className="h-full border-white/10 bg-white/10 backdrop-blur-sm transition hover:border-white/20"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                      <Icon name={feature.icon} size={24} />
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold text-body text-white">{feature.title}</p>
                      <p className="text-small text-white/80">{feature.blurb}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <aside className="flex h-full flex-col justify-between gap-6 rounded-ds-2xl bg-dark/50 p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-caption uppercase tracking-[0.2em] text-white/60">Why it works</p>
              <p className="text-h3 font-semibold text-white">Momentum after every 10-card session.</p>
              <dl className="grid gap-3">
                {METRICS.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3">
                    <dt className="text-caption uppercase tracking-wide text-white/65">{metric.label}</dt>
                    <dd className="text-h3 font-semibold text-white">{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Button variant="secondary" tone="info" asChild className="rounded-ds-xl bg-white text-dark hover:bg-white/90">
              <a href="#reviews" className="inline-flex items-center gap-2">
                Jump into today&apos;s reviews
                <Icon name="ArrowRight" size={18} />
              </a>
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default FourSkillSpotlight;
