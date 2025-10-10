// components/study/EmptyState.tsx
import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { EmptyState as DSEmptyState } from '@/components/design-system/EmptyState';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { useLocale } from '@/lib/locale';

export type StudyPlanPreset = {
  id: string;            // e.g., 'lite' | 'focus' | 'intensive' | custom
  titleKey: string;
  descriptionKey: string;
  weeks: number;
  dailyMinutesKey?: string;
  highlightKey?: string;
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
    titleKey: 'studyPlan.emptyState.presets.lite.title',
    descriptionKey: 'studyPlan.emptyState.presets.lite.description',
    weeks: 2,
    dailyMinutesKey: 'studyPlan.emptyState.presets.lite.dailyMinutes',
    highlightKey: 'studyPlan.emptyState.presets.lite.highlight',
  },
  {
    id: 'focus',
    titleKey: 'studyPlan.emptyState.presets.focus.title',
    descriptionKey: 'studyPlan.emptyState.presets.focus.description',
    weeks: 4,
    dailyMinutesKey: 'studyPlan.emptyState.presets.focus.dailyMinutes',
    highlightKey: 'studyPlan.emptyState.presets.focus.highlight',
  },
  {
    id: 'intensive',
    titleKey: 'studyPlan.emptyState.presets.intensive.title',
    descriptionKey: 'studyPlan.emptyState.presets.intensive.description',
    weeks: 6,
    dailyMinutesKey: 'studyPlan.emptyState.presets.intensive.dailyMinutes',
    highlightKey: 'studyPlan.emptyState.presets.intensive.highlight',
  },
] as const;

export function StudyPlanEmptyState({
  presets,
  busyId = null,
  onSelect,
  disabled,
  showOnboardingCta = true,
}: Props) {
  const { t, isRTL } = useLocale();
  const list = presets?.length ? presets : DEFAULT_PRESETS;

  return (
    <div className="space-y-8">
      <DSEmptyState
        title={t('studyPlan.emptyState.title')}
        description={t('studyPlan.emptyState.description')}
        icon={<Icon name="fire" size={28} title="Streak" />}
        actions={
          showOnboardingCta ? (
            <Button asChild variant="outline">
              <Link href="/onboarding">{t('studyPlan.emptyState.actions.onboarding')}</Link>
            </Button>
          ) : (
            <span className="text-small text-muted-foreground">
              {t('studyPlan.emptyState.actions.autoAdjust')}
            </span>
          )
        }
      />

      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {list.map((preset) => {
          const isBusy = busyId === preset.id;
          const dailyMinutes = preset.dailyMinutesKey
            ? t(preset.dailyMinutesKey)
            : t('studyPlan.emptyState.dailyTimeVaries');
          const highlight = preset.highlightKey ? t(preset.highlightKey) : null;
          return (
            <article
              key={preset.id}
              className="flex h-full flex-col justify-between rounded-ds-2xl border border-border bg-card/70 p-5 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
            >
              <div className="space-y-3">
                <header className="space-y-1">
                  <h3 className="text-h4 font-semibold text-foreground">{t(preset.titleKey)}</h3>
                  <p className="text-small text-muted-foreground">{t(preset.descriptionKey)}</p>
                </header>

                <dl className="grid grid-cols-2 gap-3 text-caption text-muted-foreground">
                  <div>
                    <dt className={clsx('text-[0.7rem] text-muted-foreground/80', !isRTL && 'uppercase tracking-wide')}>
                      {t('studyPlan.emptyState.durationLabel')}
                    </dt>
                    <dd className="text-small font-medium text-foreground">
                      {t('studyPlan.emptyState.durationValue', { weeks: preset.weeks })}
                    </dd>
                  </div>
                  <div>
                    <dt className={clsx('text-[0.7rem] text-muted-foreground/80', !isRTL && 'uppercase tracking-wide')}>
                      {t('studyPlan.emptyState.dailyTimeLabel')}
                    </dt>
                    <dd className="text-small font-medium text-foreground">{dailyMinutes}</dd>
                  </div>
                </dl>

                {highlight && (
                  <p className="rounded-xl bg-primary/10 px-3 py-2 text-small text-primary">
                    {highlight}
                  </p>
                )}
              </div>

              <Button
                className="mt-6"
                fullWidth
                loading={isBusy}
                loadingText={t('studyPlan.emptyState.creating')}
                disabled={disabled}
                onClick={() => onSelect(preset)}
              >
                {t('studyPlan.emptyState.startPlan')}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="text-center text-small text-muted-foreground">
        {t('studyPlan.emptyState.streakNote')}
      </p>
    </div>
  );
}

export default StudyPlanEmptyState;
