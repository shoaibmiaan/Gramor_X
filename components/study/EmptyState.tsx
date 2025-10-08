// components/study/EmptyState.tsx
import React from 'react';
import Link from 'next/link';
import { EmptyState as DSEmptyState } from '@/components/design-system/EmptyState';
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
    <div className="space-y-8">
      <DSEmptyState
        title="Create your study plan"
        description="Pick a quick preset to fill your calendar instantly. You can customise tasks later."
        icon={<Icon name="fire" size={28} title="Streak" />}
        actions={
          showOnboardingCta ? (
            <Button asChild variant="outline">
              <Link href="/onboarding">Build with onboarding</Link>
            </Button>
          ) : (
            <span className="text-small text-muted-foreground">
              Plans auto-adjust after you complete a day.
            </span>
          )
        }
      />

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
