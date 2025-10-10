// components/study/EmptyState.tsx
import React, { useMemo } from 'react';
import Link from 'next/link';
import { EmptyState as DSEmptyState } from '@/components/design-system/EmptyState';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { useLocale } from '@/lib/locale';

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

const DEFAULT_PRESET_CONFIG = [
  {
    id: 'lite',
    weeks: 2,
    titleKey: 'studyPlan.empty.presets.lite.title',
    descriptionKey: 'studyPlan.empty.presets.lite.description',
    dailyMinutesKey: 'studyPlan.empty.presets.lite.daily',
    highlightKey: 'studyPlan.empty.presets.lite.highlight',
  },
  {
    id: 'focus',
    weeks: 4,
    titleKey: 'studyPlan.empty.presets.focus.title',
    descriptionKey: 'studyPlan.empty.presets.focus.description',
    dailyMinutesKey: 'studyPlan.empty.presets.focus.daily',
    highlightKey: 'studyPlan.empty.presets.focus.highlight',
  },
  {
    id: 'intensive',
    weeks: 6,
    titleKey: 'studyPlan.empty.presets.intensive.title',
    descriptionKey: 'studyPlan.empty.presets.intensive.description',
    dailyMinutesKey: 'studyPlan.empty.presets.intensive.daily',
    highlightKey: 'studyPlan.empty.presets.intensive.highlight',
  },
] as const;

export function StudyPlanEmptyState({
  presets,
  busyId = null,
  onSelect,
  disabled,
  showOnboardingCta = true,
}: Props) {
  const { t } = useLocale();

  const fallbackPresets = useMemo<ReadonlyArray<StudyPlanPreset>>(
    () =>
      DEFAULT_PRESET_CONFIG.map((preset) => ({
        id: preset.id,
        weeks: preset.weeks,
        title: t(preset.titleKey),
        description: t(preset.descriptionKey),
        dailyMinutes: preset.dailyMinutesKey ? t(preset.dailyMinutesKey) : undefined,
        highlight: preset.highlightKey ? t(preset.highlightKey) : undefined,
      })),
    [t],
  );

  const list = presets?.length ? presets : fallbackPresets;

  return (
    <div className="space-y-8">
      <DSEmptyState
        title={t('studyPlan.empty.title')}
        description={t('studyPlan.empty.description')}
        icon={<Icon name="fire" size={28} title={t('studyPlan.empty.iconTitle')} />}
        actions={
          showOnboardingCta ? (
            <Button asChild variant="outline">
              <Link href="/onboarding">{t('studyPlan.empty.actions.onboarding')}</Link>
            </Button>
          ) : (
            <span className="text-small text-muted-foreground">
              {t('studyPlan.empty.actions.autoAdjust')}
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
                      {t('studyPlan.empty.labels.duration')}
                    </dt>
                    <dd className="text-small font-medium text-foreground">
                      {t('studyPlan.empty.labels.weeks', undefined, { count: preset.weeks })}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[0.7rem] text-muted-foreground/80">
                      {t('studyPlan.empty.labels.dailyTime')}
                    </dt>
                    <dd className="text-small font-medium text-foreground">
                      {preset.dailyMinutes ?? t('studyPlan.empty.labels.varies')}
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
                loadingText={t('studyPlan.empty.actions.creating')}
                disabled={disabled}
                onClick={() => onSelect(preset)}
              >
                {t('studyPlan.empty.actions.start')}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="text-center text-small text-muted-foreground">
        {t('studyPlan.empty.footer')}
      </p>
    </div>
  );
}

export default StudyPlanEmptyState;
