import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Alert } from '@/components/design-system/Alert';

import type { Profile } from '@/types/profile';
import { fetchProfile, markOnboardingComplete, upsertProfile } from '@/lib/profile';
import { useLocale } from '@/lib/locale';

type StepId = 1 | 2 | 3;

const STEP_CONFIG: { id: StepId; titleKey: string; descriptionKey: string }[] = [
  { id: 1, titleKey: 'onboarding.steps.band.title', descriptionKey: 'onboarding.steps.band.description' },
  { id: 2, titleKey: 'onboarding.steps.date.title', descriptionKey: 'onboarding.steps.date.description' },
  { id: 3, titleKey: 'onboarding.steps.whatsapp.title', descriptionKey: 'onboarding.steps.whatsapp.description' },
];

const quickBands = ['6.5', '7.0', '7.5', '8.0'];

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const skeletonLines = [
  'h-5 w-32',
  'h-4 w-3/4',
  'h-4 w-full',
  'h-4 w-2/3',
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { t } = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [step, setStep] = useState<StepId>(1);
  const [band, setBand] = useState('7.0');
  const [examDate, setExamDate] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const qNext = typeof router.query.next === 'string' ? router.query.next : null;
    return qNext && qNext.startsWith('/') ? qNext : '/dashboard';
  }, [router.query.next]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchProfile();
        if (!active) return;

        if (!data) {
          setProfile(null);
          setBand('7.0');
          setExamDate('');
          setOptIn(false);
          setPhone('');
          setStep(1);
          return;
        }

        setProfile(data);
        if (data.goal_band != null) {
          setBand(Number(data.goal_band).toFixed(1));
        }
        if (data.exam_date) {
          setExamDate(data.exam_date.slice(0, 10));
        }

        const channels = new Set<string>(data.notification_channels ?? []);
        const initialOptIn = channels.has('whatsapp') || data.whatsapp_opt_in === true;
        setOptIn(initialOptIn);
        if (data.phone) setPhone(data.phone);

        const completed = data.onboarding_complete === true;
        const completedStep = Number(data.onboarding_step ?? 0);
        if (completed) {
          setStep(3);
        } else {
          const nextStep = Math.min(3, Math.max(1, completedStep + 1)) as StepId;
          setStep(nextStep);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Not authenticated') {
          const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          await router.replace(`/login${suffix}`);
          return;
        }
        if (active) setError(t('onboarding.errors.loadProfile'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router, nextPath]);

  const updateProfile = useCallback(
    async (patch: Parameters<typeof upsertProfile>[0], nextStep?: StepId) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await upsertProfile(patch);
        setProfile(updated as Profile);
        if (typeof nextStep === 'number') {
          setStep(nextStep);
        }
      } catch (err) {
        setError(t('onboarding.errors.saveProfile'));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleBandNext = async () => {
    const parsed = Number(band);
    if (Number.isNaN(parsed) || parsed < 4 || parsed > 9) {
      setError(t('onboarding.errors.bandRange'));
      return;
    }
    await updateProfile({ goal_band: parsed, onboarding_step: 1, onboarding_complete: false }, 2);
  };

  const handleDateNext = async () => {
    await updateProfile({ exam_date: examDate || null, onboarding_step: 2 }, 3);
  };

  const finish = async () => {
    setPhoneError(null);
    const baseChannels = new Set<string>(profile?.notification_channels ?? []);
    let phoneValue: string | null = null;

    if (optIn) {
      const trimmed = phone.trim();
      if (!phoneRegex.test(trimmed)) {
        setPhoneError(t('onboarding.errors.phoneFormat'));
        return;
      }
      phoneValue = trimmed;
      baseChannels.add('whatsapp');
    } else {
      baseChannels.delete('whatsapp');
    }

    try {
      await updateProfile(
        {
          phone: phoneValue,
          notification_channels: Array.from(baseChannels),
          whatsapp_opt_in: optIn,
          onboarding_step: 3,
          onboarding_complete: true,
        },
      );
      await markOnboardingComplete();
      await router.replace(nextPath);
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
        await router.replace(`/login${suffix}`);
      }
    }
  };

  const skip = async () => {
    try {
      await updateProfile({ onboarding_step: 3, onboarding_complete: true });
      await markOnboardingComplete();
      await router.replace(nextPath);
    } catch (err) {
      setError(t('onboarding.errors.skip'));
    }
  };

  const back = () => {
    if (step === 1) return;
    setError(null);
    setStep((step - 1) as StepId);
  };

  useEffect(() => {
    if (!optIn) {
      setPhoneError(null);
    }
  }, [optIn]);

  return (
    <div className="min-h-screen bg-lightBg/40 py-12 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container className="max-w-3xl">
        <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur">
          <header className="flex flex-col gap-2 border-b border-border/50 pb-4">
            <span className="text-caption uppercase tracking-[0.18em] text-mutedText">
              {t('onboarding.hero.eyebrow')}
            </span>
            <h1 className="text-h2 font-slab">{t('onboarding.hero.title')}</h1>
            <p className="text-small text-mutedText">{t('onboarding.hero.subtitle')}</p>
          </header>

          <Stepper current={step} />

          {error && (
            <Alert variant="error" className="mt-4" role="alert">
              {error}
            </Alert>
          )}

          <div className="mt-6">
            {loading ? (
              <div className="grid gap-3">
                {skeletonLines.map((cls) => (
                  <div key={cls} className={`animate-pulse rounded-md bg-muted/50 ${cls}`} />
                ))}
              </div>
            ) : (
              <StepContent
                step={step}
                band={band}
                setBand={setBand}
                examDate={examDate}
                setExamDate={setExamDate}
                optIn={optIn}
                setOptIn={setOptIn}
                phone={phone}
                setPhone={setPhone}
                phoneError={phoneError}
              />
            )}
          </div>

          <footer className="mt-8 flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-caption text-mutedText">
              <span className="rounded border border-border px-1.5 py-0.5">{step}</span>
              <span>{t('onboarding.footer.step', undefined, { current: step, total: 3 })}</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="rounded-ds-xl"
                disabled={step === 1 || saving}
                onClick={back}
              >
                {t('onboarding.footer.back')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-ds-xl"
                disabled={saving}
                onClick={skip}
              >
                {t('onboarding.footer.skip')}
              </Button>
              <Button
                type="button"
                className="rounded-ds-xl"
                onClick={() => {
                  if (loading || saving) return;
                  if (step === 1) handleBandNext();
                  else if (step === 2) handleDateNext();
                  else finish();
                }}
                disabled={loading || saving}
              >
                {saving
                  ? t('onboarding.footer.saving')
                  : step === 3
                    ? t('onboarding.footer.finish')
                    : t('onboarding.footer.next')}
              </Button>
            </div>
          </footer>
        </Card>
      </Container>
    </div>
  );
}

function Stepper({ current }: { current: StepId }) {
  const { t } = useLocale();
  return (
    <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={t('onboarding.stepper.aria')}>
      {STEP_CONFIG.map((step) => {
        const isActive = step.id === current;
        const isDone = step.id < current;
        return (
          <li
            key={step.id}
            className={[
              'rounded-ds-xl border px-3 py-3 transition',
              isActive
                ? 'border-primary/60 bg-primary/10 shadow-glow'
                : isDone
                  ? 'border-success/40 bg-success/10'
                  : 'border-border/60 bg-card/70',
            ].join(' ')}
          >
            <div className="flex items-center gap-2 text-caption font-medium uppercase tracking-[0.2em] text-mutedText">
              <span
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full border text-caption tabular-nums',
                  isDone
                    ? 'border-success/40 bg-success/20 text-success'
                    : isActive
                      ? 'border-primary/60 bg-primary text-primary-foreground'
                      : 'border-border bg-card/60 text-mutedText',
                ].join(' ')}
              >
                {step.id}
              </span>
              {isDone
                ? t('onboarding.stepper.done')
                : isActive
                  ? t('onboarding.stepper.current')
                  : t('onboarding.stepper.next')}
            </div>
            <div className="mt-2 font-semibold text-foreground">{t(step.titleKey)}</div>
            <p className="text-small text-mutedText">{t(step.descriptionKey)}</p>
          </li>
        );
      })}
    </ol>
  );
}

type StepContentProps = {
  step: StepId;
  band: string;
  setBand: (value: string) => void;
  examDate: string;
  setExamDate: (value: string) => void;
  optIn: boolean;
  setOptIn: (value: boolean) => void;
  phone: string;
  setPhone: (value: string) => void;
  phoneError: string | null;
};

function StepContent({
  step,
  band,
  setBand,
  examDate,
  setExamDate,
  optIn,
  setOptIn,
  phone,
  setPhone,
  phoneError,
}: StepContentProps) {
  const { t } = useLocale();

  if (step === 1) {
    return (
      <div className="grid gap-4">
        <div>
          <Input
            type="number"
            label={t('onboarding.band.label')}
            min="4"
            max="9"
            step="0.5"
            value={band}
            onChange={(e) => setBand(e.target.value)}
            helperText={t('onboarding.band.helper')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {quickBands.map((value) => (
            <Button
              key={value}
              type="button"
              variant={band === value ? 'primary' : 'secondary'}
              className="rounded-ds-xl"
              onClick={() => setBand(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        <p className="text-small text-mutedText">{t('onboarding.band.tip')}</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid gap-4">
        <Input
          type="date"
          label={t('onboarding.date.label')}
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          helperText={t('onboarding.date.helper')}
        />
        <p className="text-small text-mutedText">{t('onboarding.date.tip')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <label className="flex items-start gap-3 rounded-ds-xl border border-border/60 bg-card/60 p-4">
        <Checkbox
          checked={optIn}
          onCheckedChange={(checked) => setOptIn(Boolean(checked))}
        />
        <div>
          <div className="font-semibold">{t('onboarding.whatsapp.optInTitle')}</div>
          <p className="text-small text-mutedText">{t('onboarding.whatsapp.optInCopy')}</p>
        </div>
      </label>
      {optIn && (
        <Input
          label={t('onboarding.whatsapp.numberLabel')}
          placeholder="+14155552671"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={phoneError ?? undefined}
          helperText={t('onboarding.whatsapp.numberHelper')}
        />
      )}
      {!optIn && (
        <p className="text-small text-mutedText">{t('onboarding.whatsapp.emailFallback')}</p>
      )}
    </div>
  );
}
