import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import StepShell from '@/components/onboarding/StepShell';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Input } from '@/components/design-system/Input';
import { Skeleton } from '@/components/design-system/Skeleton';
import {
  TOTAL_ONBOARDING_STEPS,
  languageOptions,
  onboardingStateSchema,
  type OnboardingState,
  type OnboardingStepPayload,
  weekdayOptions,
} from '@/lib/onboarding/schema';

const STEP_LABELS = ['Language', 'Band goal', 'Exam date', 'Study plan', 'WhatsApp'] as const;

const STEP_COPIES = [
  {
    title: 'Pick your learning language',
    subtitle: 'We’ll translate prompts, reminders, and nudges so everything feels familiar.',
    hint: 'You can switch languages later from Settings → Preferences.',
  },
  {
    title: 'Set your target band',
    subtitle: 'A clear goal helps us pace mocks, AI feedback, and review sessions.',
  },
  {
    title: 'When is your IELTS exam?',
    subtitle: 'We’ll reverse-engineer the study plan so you peak near test day.',
  },
  {
    title: 'Shape your weekly rhythm',
    subtitle: 'Tell us when you can put in focused time so we can schedule smarter.',
    hint: 'We’ll schedule AI-graded tasks and mocks on the days you pick.',
  },
  {
    title: 'Stay on track with WhatsApp',
    subtitle: 'Opt in for gentle reminders and quick wins (totally optional).',
    hint: 'We send at most three nudges per week and you can opt out anytime.',
  },
] as const;

const LANGUAGE_COPY: Record<(typeof languageOptions)[number], { title: string; description: string }> = {
  en: {
    title: 'English',
    description: 'Interface, reminders, and lessons in English.',
  },
  ur: {
    title: 'اردو',
    description: 'Interface in Urdu with IELTS practice kept bilingual.',
  },
};

const quickBands = ['6.5', '7.0', '7.5', '8.0'] as const;

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const dayOrder = [...weekdayOptions];

type Language = (typeof languageOptions)[number];
type Weekday = (typeof weekdayOptions)[number];

type FormState = {
  preferredLanguage: Language;
  goalBand: string;
  examDate: string;
  studyDays: Weekday[];
  minutesPerDay: string;
  whatsappOptIn: boolean;
  phone: string;
};

const defaultFormState: FormState = {
  preferredLanguage: 'en',
  goalBand: '7.0',
  examDate: '',
  studyDays: [],
  minutesPerDay: '45',
  whatsappOptIn: false,
  phone: '',
};

export default function OnboardingWizard() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [profileState, setProfileState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const qNext = typeof router.query.next === 'string' ? router.query.next : null;
    return qNext && qNext.startsWith('/') ? qNext : '/dashboard';
  }, [router.query.next]);

  const determineStep = useCallback((data: OnboardingState | null) => {
    if (!data) return 1;
    if (data.onboardingComplete) return TOTAL_ONBOARDING_STEPS;
    const current = Number.isFinite(data.onboardingStep) ? data.onboardingStep : 0;
    return Math.min(TOTAL_ONBOARDING_STEPS, current + 1);
  }, []);

  const syncForm = useCallback((data: OnboardingState) => {
    setForm((prev) => ({
      preferredLanguage: (data.preferredLanguage as Language) ?? prev.preferredLanguage ?? 'en',
      goalBand:
        typeof data.goalBand === 'number'
          ? data.goalBand.toFixed(1)
          : prev.goalBand ?? defaultFormState.goalBand,
      examDate: data.examDate ?? '',
      studyDays: (data.studyDays as Weekday[] | null) ?? prev.studyDays ?? [],
      minutesPerDay:
        typeof data.studyMinutesPerDay === 'number'
          ? String(data.studyMinutesPerDay)
          : prev.minutesPerDay ?? defaultFormState.minutesPerDay,
      whatsappOptIn: data.whatsappOptIn ?? prev.whatsappOptIn ?? false,
      phone: data.phone ?? prev.phone ?? '',
    }));
    setPhoneError(null);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch('/api/onboarding', { signal: controller.signal });
        if (res.status === 401) {
          const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          await router.replace(`/login${suffix}`);
          return;
        }

        const body = await res.json();
        if (!res.ok) {
          const message = typeof body?.error === 'string' ? body.error : 'Unable to load onboarding data';
          throw new Error(message);
        }

        const parsed = onboardingStateSchema.parse(body);
        if (!active) return;

        setProfileState(parsed);
        syncForm(parsed);
        const nextStepValue = determineStep(parsed);
        setStep(nextStepValue);

        if (parsed.onboardingComplete) {
          await router.replace(nextPath);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Unable to load onboarding data';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [determineStep, nextPath, router, syncForm]);

  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
      if (key === 'phone' || (key === 'whatsappOptIn' && value === false)) {
        setPhoneError(null);
      }
    },
    [],
  );

  const toggleStudyDay = useCallback(
    (day: Weekday) => {
      setForm((prev) => {
        const exists = prev.studyDays.includes(day);
        const nextDays = exists
          ? prev.studyDays.filter((d) => d !== day)
          : [...prev.studyDays, day].sort(
              (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b),
            );
        return { ...prev, studyDays: nextDays };
      });
      setError(null);
    },
    [],
  );

  const persistStep = useCallback(
    async (payload: OnboardingStepPayload) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          await router.replace(`/login${suffix}`);
          throw new Error('Not authenticated');
        }

        const body = await res.json();
        if (!res.ok) {
          const message = typeof body?.error === 'string' ? body.error : 'Unable to save onboarding step';
          throw new Error(message);
        }

        const parsed = onboardingStateSchema.parse(body);
        setProfileState(parsed);
        syncForm(parsed);
        setStep(determineStep(parsed));
        return parsed;
      } finally {
        setSaving(false);
      }
    },
    [determineStep, nextPath, router, syncForm],
  );

  const handleBack = useCallback(() => {
    if (loading || saving) return;
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  }, [loading, saving]);

  const handleNext = useCallback(async () => {
    if (loading || saving) return;

    try {
      if (step === 1) {
        await persistStep({ step: 1, data: { preferredLanguage: form.preferredLanguage } });
        return;
      }

      if (step === 2) {
        const parsed = Number(form.goalBand);
        if (Number.isNaN(parsed) || parsed < 4 || parsed > 9) {
          setError('Choose a band between 4.0 and 9.0.');
          return;
        }
        const normalized = Math.round(parsed * 2) / 2;
        await persistStep({ step: 2, data: { goalBand: normalized } });
        setForm((prev) => ({ ...prev, goalBand: normalized.toFixed(1) }));
        return;
      }

      if (step === 3) {
        const trimmed = form.examDate.trim();
        if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          setError('Enter a valid date in YYYY-MM-DD format.');
          return;
        }
        await persistStep({ step: 3, data: { examDate: trimmed || '' } });
        return;
      }

      if (step === 4) {
        if (form.studyDays.length === 0) {
          setError('Select at least one day you can dedicate to studying.');
          return;
        }
        const minutes = Number.parseInt(form.minutesPerDay, 10);
        if (Number.isNaN(minutes) || minutes < 15 || minutes > 240) {
          setError('Choose a daily study target between 15 and 240 minutes.');
          return;
        }
        await persistStep({ step: 4, data: { studyDays: form.studyDays, minutesPerDay: minutes } });
        setForm((prev) => ({ ...prev, minutesPerDay: String(minutes) }));
        return;
      }

      if (step === 5) {
        setPhoneError(null);
        const trimmed = form.phone.trim();
        if (form.whatsappOptIn && !phoneRegex.test(trimmed)) {
          setPhoneError('Enter a valid phone number in international format (e.g. +14155552671).');
          return;
        }
        const result = await persistStep({
          step: 5,
          data: {
            whatsappOptIn: form.whatsappOptIn,
            phone: form.whatsappOptIn ? trimmed : '',
          },
        });
        if (result.onboardingComplete) {
          await router.replace(nextPath);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unable to save onboarding step';
      setError(message);
    }
  }, [form, loading, nextPath, persistStep, router, saving, step]);

  const stepMeta = useMemo(
    () =>
      STEP_LABELS.map((label, index) => ({
        label,
        done: (profileState?.onboardingStep ?? 0) >= index + 1,
      })),
    [profileState?.onboardingStep],
  );

  const copy = STEP_COPIES[step - 1] ?? STEP_COPIES[0];

  return (
    <StepShell
      step={step}
      total={TOTAL_ONBOARDING_STEPS}
      title={copy.title}
      subtitle={copy.subtitle}
      hint={copy.hint}
      steps={stepMeta}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={saving ? 'Saving…' : 'Continue'}
      nextDisabled={saving || loading}
    >
      {error && (
        <Alert variant="error" className="mb-4" role="alert">
          {error}
        </Alert>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <StepContent
          step={step}
          form={form}
          updateForm={updateForm}
          toggleStudyDay={toggleStudyDay}
          phoneError={phoneError}
        />
      )}
    </StepShell>
  );
}

type StepContentProps = {
  step: number;
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleStudyDay: (day: Weekday) => void;
  phoneError: string | null;
};

function StepContent({ step, form, updateForm, toggleStudyDay, phoneError }: StepContentProps) {
  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-small text-mutedText">Pick the language that feels most comfortable for instructions and reminders.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {languageOptions.map((option) => {
            const selected = form.preferredLanguage === option;
            const copy = LANGUAGE_COPY[option];
            return (
              <Button
                key={option}
                type="button"
                variant={selected ? 'primary' : 'secondary'}
                className="flex w-full flex-col items-start gap-1 rounded-ds-xl px-4 py-3 text-left"
                onClick={() => updateForm('preferredLanguage', option)}
              >
                <span className="text-base font-semibold">{copy.title}</span>
                <span className="text-small text-mutedText">{copy.description}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <Input
          type="number"
          label="Target overall band"
          min={4}
          max={9}
          step={0.5}
          value={form.goalBand}
          onChange={(event) => updateForm('goalBand', event.target.value)}
          helperText="Most universities aim for 6.5–7.0. Setting your target 0.5 higher gives breathing room."
        />
        <div className="flex flex-wrap gap-2">
          {quickBands.map((band) => {
            const selected = form.goalBand === band;
            return (
              <Button
                key={band}
                type="button"
                variant={selected ? 'primary' : 'secondary'}
                className="rounded-ds-xl"
                onClick={() => updateForm('goalBand', band)}
              >
                {band}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-4">
        <Input
          type="date"
          label="IELTS exam date"
          value={form.examDate}
          onChange={(event) => updateForm('examDate', event.target.value)}
          helperText="Leave blank if you haven’t booked yet—we’ll suggest a four-week ramp."
        />
        <p className="text-small text-mutedText">
          We’ll pace mocks, AI-evaluated writing, and speaking drills so you peak near your exam.
        </p>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-small text-mutedText">Which days can you reliably dedicate to IELTS prep?</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {weekdayOptions.map((day) => {
              const selected = form.studyDays.includes(day);
              return (
                <Button
                  key={day}
                  type="button"
                  variant={selected ? 'primary' : 'secondary'}
                  className="rounded-ds-xl px-3 py-2 font-semibold"
                  onClick={() => toggleStudyDay(day)}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </div>
        <Input
          type="number"
          label="Minutes per study day"
          min={15}
          max={240}
          step={5}
          value={form.minutesPerDay}
          onChange={(event) => updateForm('minutesPerDay', event.target.value)}
          helperText="We recommend at least 45 focused minutes. Your plan will adapt to this budget."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Checkbox
        checked={form.whatsappOptIn}
        onCheckedChange={(checked) => updateForm('whatsappOptIn', Boolean(checked))}
        label="Send me WhatsApp nudges"
        description="2–3 gentle reminders per week with prompts, checklists, and next steps."
      />
      {form.whatsappOptIn ? (
        <Input
          label="WhatsApp number"
          placeholder="+14155552671"
          value={form.phone}
          onChange={(event) => updateForm('phone', event.target.value)}
          helperText="Use your full international number including country code."
          error={phoneError ?? undefined}
        />
      ) : (
        <p className="text-small text-mutedText">
          Prefer email? Enable WhatsApp reminders later from Settings → Notifications.
        </p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
    </div>
  );
}
