// components/sections/Hero.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import Icon from '@/components/design-system/Icon';
import { LaunchCountdown } from '@/components/launch/LaunchCountdown';

export type HeroProps = {
  serverNowMsUTC: number;
  launchMsUTC: number;
};

export const Hero: React.FC<HeroProps> = ({ serverNowMsUTC, launchMsUTC }) => {
  return (
    <section className="relative overflow-hidden bg-lightBg dark:bg-gradient-to-br dark:from-dark/90 dark:via-dark/85 dark:to-darker/90">
      <Container className="relative py-16 md:py-20 lg:py-24">
        {/* subtle glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-32 -right-10 h-64 w-64 rounded-full bg-electricBlue/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-10 h-72 w-72 rounded-full bg-purpleVibe/10 blur-3xl" />
        </div>

        <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* LEFT: copy + CTAs */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/60">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="Sparkles" size={14} />
              </span>
              <span>IELTS Mission Control • Private beta</span>
            </div>

            <div className="space-y-4">
              <h1
                id="hero-heading"
                className="font-slab text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl"
              >
                IELTS prep that actually
                <span className="text-gradient-primary block">respects your time.</span>
              </h1>
              <p className="max-w-xl text-sm md:text-base text-muted-foreground">
                Listening, Reading, Writing, Speaking — one workspace with AI-first feedback,
                meaningful streaks, and a dashboard that tells you exactly what to do next
                for your target band.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Icon name="Target" size={14} /> Built for band 6.0 – 8.0 journeys
              </span>
              <span className="hidden md:inline">•</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="Globe2" size={14} /> Focus on Pakistan + global learners
              </span>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                as={Link}
                href="/signup"
                variant="primary"
                size="lg"
                className="rounded-ds-2xl px-6"
              >
                Start free practice
              </Button>
              <Button
                as={Link}
                href="/login?next=/dashboard"
                variant="secondary"
                size="lg"
                className="rounded-ds-2xl px-6"
              >
                Go to my dashboard
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Icon name="ShieldCheck" size={13} /> No card required on Free
              </span>
              <span>•</span>
              <span>Rocket unlocks deeper AI feedback + more mocks</span>
            </div>
          </div>

          {/* RIGHT: countdown + proof */}
          <div className="space-y-4">
            <Card className="rounded-ds-2xl border border-border/70 bg-surface/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Next cohort opens
                  </p>
                  <p className="font-slab text-lg text-foreground">Early access window</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  Limited seats per batch
                </span>
              </div>

              <LaunchCountdown
                serverNowMsUTC={serverNowMsUTC}
                launchMsUTC={launchMsUTC}
                className="justify-start md:justify-center"
              />

              <p className="mt-3 text-[11px] text-muted-foreground">
                We onboard in small groups so support doesn’t feel like a ticketing system.
                Join the waitlist now and we’ll reserve early pricing for your batch.
              </p>
            </Card>

            <Card className="rounded-ds-2xl border border-border/70 bg-surface/95 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Realistic prep, real constraints
                  </p>
                  <p className="text-sm text-foreground">
                    Evening learners, uni students, full-time professionals.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-success">
                    <Icon name="TrendingUp" size={14} /> +1.5 avg band lift
                  </span>
                  <span>with consistent 6–8 weeks usage</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Hero;
