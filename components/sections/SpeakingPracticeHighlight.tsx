import React from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Icon } from '@/components/design-system/Icon';

const featurePills = [
  { icon: 'Mic', label: 'Live tutor, AI & peer rooms' },
  { icon: 'Sparkles', label: 'Pronunciation coach' },
  { icon: 'Library', label: '500+ prompts & packs' },
  { icon: 'Users', label: 'Community review threads' },
] as const;

export function SpeakingPracticeHighlight() {
  return (
    <Container>
      <Card className="border border-border/60 bg-background/90 p-8 shadow-lg backdrop-blur rounded-ds-3xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="accent" size="sm" className="inline-flex items-center gap-2">
              <Icon name="Mic" size={16} />
              Speaking practice hub
            </Badge>
            <h2 className="mt-4 font-slab text-3xl font-semibold text-foreground sm:text-4xl">
              One launchpad for every speaking workout
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Jump into the simulator, coach, live rooms, adaptive next steps, and community reviews from a single, plan-aware hub.
              Bookmark it and reach it from Practice, Dashboard, or the app home.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {featurePills.map((feature) => (
                <span
                  key={feature.label}
                  className="inline-flex items-center gap-2 rounded-full border border-electricBlue/30 bg-electricBlue/5 px-4 py-2 text-sm font-medium text-electricBlue"
                >
                  <Icon name={feature.icon} size={16} />
                  {feature.label}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/speaking" variant="primary" className="rounded-ds-xl">
                Visit speaking hub
              </Button>
              <Button href="/practice/speaking" variant="ghost" className="rounded-ds-xl">
                Open from practice
              </Button>
            </div>
          </div>

          <div className="grid w-full max-w-sm gap-3 self-center rounded-ds-2xl bg-muted/40 p-4 text-left text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Adaptive card preview</p>
              <p className="mt-1 font-semibold text-foreground">Next task: Pronunciation drill /θ/</p>
              <p className="mt-1">90 seconds • Based on your last attempt from yesterday</p>
            </div>
            <div className="rounded-ds-2xl bg-background/80 p-3 shadow-sm">
              <p className="font-semibold text-foreground">Live sessions today</p>
              <p className="mt-1 text-sm">1 peer review circle • 1 AI coach replay</p>
            </div>
            <div className="rounded-ds-2xl bg-background/80 p-3 shadow-sm">
              <p className="font-semibold text-foreground">Prompt spotlight</p>
              <p className="mt-1 text-sm">Part 2 • Describe a time you solved a tricky problem at work</p>
              <Button href="/speaking/library" variant="ghost" className="mt-3 rounded-ds-xl px-3 py-2 text-sm">
                Browse prompts
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Container>
  );
}

export default SpeakingPracticeHighlight;
