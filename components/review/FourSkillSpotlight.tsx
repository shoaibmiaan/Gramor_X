import React from 'react';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

const HIGHLIGHTS = [
  {
    icon: 'book-open',
    title: 'Context-first reading',
    description:
      'IELTS-style mini cloze prompts surface register, tone, and nuance so every encounter reinforces how the word lives in real passages.',
  },
  {
    icon: 'headphones',
    title: 'Active listening',
    description:
      'Studio-grade audio and gap-ready examples sharpen your ear before you grade the card, keeping pronunciation fresh in your mind.',
  },
  {
    icon: 'pencil',
    title: 'Micro-writing coach',
    description:
      'Two-sentence challenges catch collocation slips instantly and push you toward confident exam-ready prose.',
  },
  {
    icon: 'mic',
    title: 'Speaking confidence',
    description:
      'Record, replay, and get instant phoneme similarity feedback so you master stress patterns without leaving the flow.',
  },
] as const;

const STATS = [
  { value: '10+', label: 'Exercises per word' },
  { value: '40 / 40 / 20', label: 'Smart review mix' },
  { value: 'IELTS', label: 'Topic-aligned prompts' },
] as const;

export function FourSkillSpotlight() {
  return (
    <section aria-labelledby="four-skill-spotlight" className="relative mt-10">
      <div className="relative overflow-hidden rounded-ds-2xl border border-white/10 bg-gradient-to-br from-primary via-purpleVibe to-electricBlue text-white shadow-glow">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-goldenYellow/30 blur-3xl" />
        </div>

        <div className="relative px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-6">
              <Badge variant="subtle" size="sm" className="bg-white/10 text-white/90">
                Four-skill mastery
              </Badge>
              <div>
                <h2 id="four-skill-spotlight" className="font-slab text-h2 leading-tight text-white">
                  A beautiful training flow designed to hook every learner
                </h2>
                <p className="mt-3 max-w-lg text-body text-white/90">
                  Build a habit with immersive cards that weave vocabulary into listening, speaking, reading,
                  and writing—without losing the joy of quick wins.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {HIGHLIGHTS.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/15">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Icon name={item.icon} size={22} className="text-white" />
                      </span>
                      <div>
                        <p className="font-medium text-body text-white">{item.title}</p>
                        <p className="mt-1 text-small text-white/80">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col justify-between rounded-2xl bg-dark/40 p-6 backdrop-blur">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-small uppercase tracking-widest text-white/60">Why learners stay</p>
                  <p className="text-h3 font-semibold text-white">Momentum you can feel after day one.</p>
                </div>
                <dl className="grid gap-4">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white/5 px-4 py-3">
                      <dt className="text-caption uppercase tracking-wide text-white/60">{stat.label}</dt>
                      <dd className="text-h3 font-semibold text-white">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Button
                href="/dashboard#reviews"
                variant="subtle"
                className="mt-8 rounded-ds-xl border border-white/30 bg-white/10 text-white hover:bg-white/20"
                trailingIcon={<Icon name="arrow-right" size={18} className="text-white" />}
              >
                Jump into today&apos;s session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FourSkillSpotlight;
