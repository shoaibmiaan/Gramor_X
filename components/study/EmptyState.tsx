import React, { useMemo } from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { useLocale } from '@/lib/locale';

export type StudyPlanPreset = {
  id: string;
  weeks: number;
  /** Either provide concrete strings... */
  title?: string;
  description?: string;
  dailyMinutes?: string;
  highlight?: string;
  /** ...or i18n keys (used if concrete strings are missing) */
  titleKey?: string;
  descriptionKey?: string;
  dailyMinutesKey?: string;
  highlightKey?: string;
};

type Props = {
  presets?: ReadonlyArray<StudyPlanPreset>;
  busyId?: string | null;
  onSelect: (preset: StudyPlanPreset) => void | Promise<void>;
  disabled?: boolean;
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

  const list = useMemo<ReadonlyArray<StudyPlanPreset>>(() => {
    if (!presets?.length) return fallbackPresets;
    // allow callers to pass titleKey/descriptionKey instead of concrete strings
    return presets.map((p) => ({
      ...p,
      title: p.title ?? (p.titleKey ? t(p.titleKey) : p.title),
      description: p.description ?? (p.descriptionKey ? t(p.descriptionKey) : p.description),
      dailyMinutes: p.dailyMinutes ?? (p.dailyMinutesKey ? t(p.dailyMinutesKey) : p.dailyMinutes),
      highlight: p.highlight ?? (p.highlightKey ? t(p.highlightKey) : p.highlight),
    }));
  }, [fallbackPresets, presets, t]);

  return (
    <div className="space-y-10">
      <Card
        padding="lg"
        className="flex flex-col gap-6 rounded-ds-3xl border-dashed border-border/70 bg-card/80 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon name="book-open" size={28} title={t('studyPlan.empty.iconTitle', 'Study plan quickstart')} />
          </span>
          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground/70">
              {t('studyPlan.empty.quickstart.badge', 'Quickstart')}
            </p>
            <h2 className="font-slab text-h3 text-foreground">
              {t('studyPlan.empty.title', 'Let’s build your IELTS routine')}
            </h2>
            <p className="max-w-xl text-body text-muted-foreground">
              {t(
                'studyPlan.empty.description',
                'Generate a personalised schedule with the plan builder or take a baseline mock to see where to focus first.',
              )}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
          {showOnboardingCta ? (
            <Button asChild fullWidth>
              <Link href="/onboarding">{t('studyPlan.empty.actions.onboarding', 'Generate my plan')}</Link>
            </Button>
          ) : (
            <p className="rounded-ds-xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-small text-muted-foreground">
              {t(
                'studyPlan.empty.actions.autoAdjust',
                'Plans auto-adjust after you complete a day. Come back any time for a fresh schedule.',
              )}
            </p>
          )}
          <Button asChild fullWidth variant="soft" tone="info">
            <Link href="/mock">{t('studyPlan.empty.actions.baseline', 'Take baseline mock')}</Link>
          </Button>
        </div>
      </Card>

      <div className="space-y-3 text-center">
        <h3 className="font-slab text-h4 text-foreground">
          {t('studyPlan.empty.pickPreset', 'Or pick a quick preset')}
        </h3>
        <p className="mx-auto max-w-2xl text-body text-muted-foreground">
          {t(
            'studyPlan.empty.pickPresetSub',
            'Choose a template to fill your calendar instantly. You can tweak tasks and regenerate whenever you like.',
          )}
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
                      {t('studyPlan.empty.labels.duration', 'Duration')}
                    </dt>
                    <dd className="text-small font-medium text-foreground">
                      {t('studyPlan.empty.labels.weeks', '{{count}} wk', { count: preset.weeks })}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[0.7rem] text-muted-foreground/80">
                      {t('studyPlan.empty.labels.dailyTime', 'Daily time')}
                    </dt>
                    <dd className="text-small font-medium text-foreground">
                      {preset.dailyMinutes ?? t('studyPlan.empty.labels.varies', 'Varies')}
                    </dd>
                  </div>
                </dl>

                {preset.highlight && (
                  <p className="rounded-xl bg-primary/10 px-3 py-2 text-small text-primary">{preset.highlight}</p>
                )}
              </div>

              <Button
                className="mt-6"
                fullWidth
                loading={isBusy}
                loadingText={t('studyPlan.empty.actions.creating', 'Creating…')}
                disabled={disabled}
                onClick={() => onSelect(preset)}
              >
                {t('studyPlan.empty.actions.start', 'Start with this preset')}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="text-center text-small text-muted-foreground">
        {t('studyPlan.empty.footer', 'You can regenerate a fresh plan anytime.')}
      </p>
    </div>
  );
}

export default StudyPlanEmptyState;
