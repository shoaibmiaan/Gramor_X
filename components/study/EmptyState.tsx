// components/study/EmptyState.tsx
import React from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

export type StudyPlanPreset = {
  id: string;            // e.g., 'lite' | 'focus' | 'intensive' | custom
  title: string;
  description: string;
  weeks: number;
  dailyMinutes?: string;
  highlight?: string;
};

type Props = {
  /** Optional custom presets; if omitted we show sensible defaults. */
  presets?: ReadonlyArray<StudyPlanPreset>;
  /** When a preset is being created, pass its id to show loading state on that card. */
  busyId?: string | null;
  /** Called when user selects a preset. */
  onSelect: (preset: StudyPlanPreset) => void | Promise<void>;
  /** Disable all actions (e.g., while creating). */
  disabled?: boolean;
  /** Show an onboarding CTA under the EmptyState header (default true). */
  showOnboardingCta?: boolean;
};

const DEFAULT_PRESETS: ReadonlyArray<StudyPlanPreset> = [
  {
    id: 'lite',
    title: 'Lite reset (2 weeks)',
    description: 'Ease back in with short daily sessions and vocabulary refreshers.',
    weeks: 2,
    dailyMinutes: '30 min/day',
    highlight: 'Rebuild momentum quickly.',
  },
  {
    id: 'focus',
    title: 'Balanced focus (4 weeks)',
    description: 'Structured mix of all four modules with weekly review checkpoints.',
    weeks: 4,
    dailyMinutes: '45–60 min/day',
    highlight: 'Weekly mocks + targeted drills.',
  },
  {
    id: 'intensive',
    title: 'Intensive push (6 weeks)',
    description: 'Longer study blocks and extra mocks for a final exam sprint.',
    weeks: 6,
    dailyMinutes: '75 min/day',
    highlight: 'Two mock exams per week.',
  },
] as const;

export function StudyPlanEmptyState({
  presets,
  busyId = null,
  onSelect,
  disabled,
  showOnboardingCta = true,
}: Props) {
  const list = presets?.length ? presets : DEFAULT_PRESETS;

  return (
    <div className="space-y-10">
      <Card
        padding="lg"
        className="flex flex-col gap-6 rounded-ds-3xl border-dashed border-border/70 bg-card/80 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon name="book-open" size={28} title="Study plan quickstart" />
          </span>
          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground/70">Quickstart</p>
            <h2 className="font-slab text-h3 text-foreground">Let’s build your IELTS routine</h2>
            <p className="max-w-xl text-body text-muted-foreground">
              Generate a personalised schedule with the plan builder or take a baseline mock to see where to focus first.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
          {showOnboardingCta ? (
            <Button asChild fullWidth>
              <Link href="/onboarding">Generate my plan</Link>
            </Button>
          ) : (
            <p className="rounded-ds-xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-small text-muted-foreground">
              Plans auto-adjust after you complete a day. Come back any time for a fresh schedule.
            </p>
          )}
          <Button asChild fullWidth variant="soft" tone="info">
            <Link href="/mock-tests">Take baseline mock</Link>
          </Button>
        </div>
      </Card>

      <div className="space-y-3 text-center">
        <h3 className="font-slab text-h4 text-foreground">Or pick a quick preset</h3>
        <p className="mx-auto max-w-2xl text-body text-muted-foreground">
          Choose a template to fill your calendar instantly. You can tweak tasks and regenerate whenever you like.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {list.map((preset) => {
          const isBusy = busyId === preset.id;
          return (
            <article
              key={preset.id}
              className="flex h-full flex-col justify-between rounded-ds-2xl border border-border bg-card/70 p-5 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
            >
              <div className="space-y-3">
                <header className="space-y-1">
                  <h3 className="text-h4 font-semibold text-foreground">{preset.title}</h3>
                  <p className="text-small text-muted-foreground">{preset.description}</p>
                </header>

                <dl className="grid grid-cols-2 gap-3 text-caption text-muted-foreground">
                  <div>
                    <dt className="uppercase tracking-wide text-[0.7rem] text-muted-foreground/80">
                      Duration
                    </dt>
                    <dd className="text-small font-medium text-foreground">{preset.weeks} weeks</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[0.7rem] text-muted-foreground/80">
                      Daily time
                    </dt>
                    <dd className="text-small font-medium text-foreground">
                      {preset.dailyMinutes ?? 'Varies'}
                    </dd>
                  </div>
                </dl>

                {preset.highlight && (
                  <p className="rounded-xl bg-primary/10 px-3 py-2 text-small text-primary">
                    {preset.highlight}
                  </p>
                )}
              </div>

              <Button
                className="mt-6"
                fullWidth
                loading={isBusy}
                loadingText="Creating…"
                disabled={disabled}
                onClick={() => onSelect(preset)}
              >
                Start this plan
              </Button>
            </article>
          );
        })}
      </div>

      <p className="text-center text-small text-muted-foreground">
        Your daily streak starts counting after you complete the first task in your plan.
      </p>
    </div>
  );
}

export default StudyPlanEmptyState;
