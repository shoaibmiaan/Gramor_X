import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Alert } from '@/components/design-system/Alert';

import type { Profile } from '@/types/profile';
import { fetchProfile, markOnboardingComplete, upsertProfile } from '@/lib/profile';
import { emitUserEvent } from '@/lib/analytics/user';

type StepId = 1 | 2 | 3;

const STEPS: { id: StepId; title: string; description: string }[] = [
  { id: 1, title: 'Target band', description: 'What score are you aiming for?' },
  { id: 2, title: 'Exam date', description: 'When is your IELTS exam?' },
  { id: 3, title: 'WhatsApp updates', description: 'Get gentle reminders and nudges.' },
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

  const startTracked = useRef(false);

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
        const message = err instanceof Error ? err.message : 'Unable to load profile';
        if (message === 'Not authenticated') {
          const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          await router.replace(`/login${suffix}`);
          return;
        }
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router, nextPath]);

  useEffect(() => {
    if (loading || startTracked.current) return;
    startTracked.current = true;
    void emitUserEvent('onboarding_start', { step, delta: 0 });
  }, [loading, step]);

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
        const message = err instanceof Error ? err.message : 'Unable to save changes';
        setError(message);
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
      setError('Choose a band between 4.0 and 9.0.');
      return;
    }
    const prev = step;
    await updateProfile({ goal_band: parsed, onboarding_step: 1, onboarding_complete: false }, 2);
    const delta = Math.max(0, 2 - prev);
    void emitUserEvent('onboarding_step_complete', { step: prev, delta });
  };

  const handleDateNext = async () => {
    const prev = step;
    await updateProfile({ exam_date: examDate || null, onboarding_step: 2 }, 3);
    const delta = Math.max(0, 3 - prev);
    void emitUserEvent('onboarding_step_complete', { step: prev, delta });
  };

  const finish = async () => {
    setPhoneError(null);
    const baseChannels = new Set<string>(profile?.notification_channels ?? []);
    let phoneValue: string | null = null;

    if (optIn) {
      const trimmed = phone.trim();
      if (!phoneRegex.test(trimmed)) {
        setPhoneError('Enter a valid phone number in international format (e.g. +14155552671).');
        return;
      }
      phoneValue = trimmed;
      baseChannels.add('whatsapp');
    } else {
      baseChannels.delete('whatsapp');
    }

    try {
      const prev = step;
      await updateProfile(
        {
          phone: phoneValue,
          notification_channels: Array.from(baseChannels),
          whatsapp_opt_in: optIn,
          onboarding_step: 3,
          onboarding_complete: true,
        },
        3,
      );
      await markOnboardingComplete();
      const delta = 3 - prev;
      if (delta > 0) {
        void emitUserEvent('onboarding_step_complete', { step: prev, delta });
      }
      void emitUserEvent('onboarding_done', { step: 3, delta: 0 });
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
      const prev = step;
      await updateProfile({ onboarding_step: 3, onboarding_complete: true }, 3);
      await markOnboardingComplete();
      const delta = 3 - prev;
      if (delta > 0) {
        void emitUserEvent('onboarding_step_complete', { step: prev, delta });
      }
      void emitUserEvent('onboarding_done', { step: 3, delta: 0 });
      await router.replace(nextPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to skip onboarding';
      setError(message);
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
            <span className="text-caption uppercase tracking-[0.18em] text-mutedText">Welcome aboard</span>
            <h1 className="text-h2 font-slab">Let’s tailor your IELTS prep</h1>
            <p className="text-small text-mutedText">
              Three quick questions so we can personalise mocks, reminders, and feedback.
            </p>
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
              <span>
                Step {step} of 3
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="rounded-ds-xl"
                disabled={step === 1 || saving}
                onClick={back}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-ds-xl"
                disabled={saving}
                onClick={skip}
              >
                Skip for now
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
                {saving ? 'Saving…' : step === 3 ? 'Finish' : 'Continue'}
              </Button>
            </div>
          </footer>
        </Card>
      </Container>
    </div>
  );
}

function Stepper({ current }: { current: StepId }) {
  return (
    <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Onboarding steps">
      {STEPS.map((step) => {
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
              {isDone ? 'Done' : isActive ? 'Now' : 'Next'}
            </div>
            <div className="mt-2 font-semibold text-foreground">{step.title}</div>
            <p className="text-small text-mutedText">{step.description}</p>
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
  if (step === 1) {
    return (
      <div className="grid gap-4">
        <div>
          <Input
            type="number"
            label="Target overall band"
            min="4"
            max="9"
            step="0.5"
            value={band}
            onChange={(e) => setBand(e.target.value)}
            helperText="You can update this any time from your profile."
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
        <p className="text-small text-mutedText">
          Most universities ask for 6.5–7.0. Aim 0.5 higher to give yourself a buffer on test day.
        </p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid gap-4">
        <Input
          type="date"
          label="IELTS exam date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          helperText="Not sure yet? Leave blank and we’ll suggest a four-week ramp-up."
        />
        <p className="text-small text-mutedText">
          We’ll pace mocks and AI-evaluated writing tasks to help you peak at the right time.
        </p>
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
          <div className="font-semibold">Send me WhatsApp nudges</div>
          <p className="text-small text-mutedText">
            2–3 gentle reminders per week with study prompts and quick wins. You can opt out any time.
          </p>
        </div>
      </label>
      {optIn && (
        <Input
          label="WhatsApp number"
          placeholder="+14155552671"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={phoneError ?? undefined}
          helperText="We’ll only use this for study reminders. Standard carrier charges may apply."
        />
      )}
      {!optIn && (
        <p className="text-small text-mutedText">
          Prefer email? No problem — you can enable WhatsApp reminders later from Settings › Notifications.
        </p>
      )}
    </div>
  );
}
