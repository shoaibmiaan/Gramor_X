import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import StepShell from '@/components/onboarding/StepShell';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Input } from '@/components/design-system/Input';
import { Skeleton } from '@/components/design-system/Skeleton';
import { emitUserEvent } from '@/lib/analytics/user';
import {
  TOTAL_ONBOARDING_STEPS,
  languageOptions,
  onboardingStateSchema,
  type OnboardingState,
  weekdayOptions,
} from '@/lib/onboarding/schema';
import { markOnboardingComplete } from '@/lib/profile';

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

type FieldErrors = Partial<Record<keyof FormState, string>>;

type StepId = 1 | 2 | 3 | 4 | 5;

const defaultFormState: FormState = {
  preferredLanguage: 'en',
  goalBand: '7.0',
  examDate: '',
  studyDays: [],
  minutesPerDay: '45',
  whatsappOptIn: false,
  phone: '',
};

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

export default function OnboardingWizard() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [profileState, setProfileState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const startTracked = useRef(false);

  const nextPath = useMemo(() => {
    const qNext = typeof router.query.next === 'string' ? router.query.next : null;
    return qNext && qNext.startsWith('/') ? qNext : '/dashboard';
  }, [router.query.next]);

  const determineStep = useCallback((state: OnboardingState | null) => {
    if (!state) return 1;
    if (state.onboardingComplete) return TOTAL_ONBOARDING_STEPS as StepId;
    const highest = Math.max(0, state.onboardingStep ?? 0);
    const next = Math.min(TOTAL_ONBOARDING_STEPS, Math.max(1, highest + 1));
    return next as StepId;
  }, []);

  const syncForm = useCallback((state: OnboardingState) => {
    setForm({
      preferredLanguage: (state.preferredLanguage as Language) ?? defaultFormState.preferredLanguage,
      goalBand:
        typeof state.goalBand === 'number'
          ? state.goalBand.toFixed(Number.isInteger(state.goalBand) ? 0 : 1)
          : defaultFormState.goalBand,
      examDate: state.examDate ?? defaultFormState.examDate,
      studyDays: Array.isArray(state.studyDays) ? state.studyDays : defaultFormState.studyDays,
      minutesPerDay:
        typeof state.studyMinutesPerDay === 'number'
          ? String(state.studyMinutesPerDay)
          : defaultFormState.minutesPerDay,
      whatsappOptIn: state.whatsappOptIn ?? defaultFormState.whatsappOptIn,
      phone: state.phone ?? defaultFormState.phone,
    });
  }, []);

  const stepMeta = useMemo(
    () => [
      { label: 'Language', done: (profileState?.onboardingStep ?? 0) >= 1 },
      { label: 'Target band', done: (profileState?.onboardingStep ?? 0) >= 2 },
      { label: 'Exam date', done: (profileState?.onboardingStep ?? 0) >= 3 },
      { label: 'Study rhythm', done: (profileState?.onboardingStep ?? 0) >= 4 },
      { label: 'Notifications', done: profileState?.onboardingComplete === true },
    ],
    [profileState?.onboardingComplete, profileState?.onboardingStep],
  );

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
        if (err instanceof Error && err.message === 'Not authenticated') return;
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

  useEffect(() => {
    if (loading || startTracked.current) return;
    startTracked.current = true;
    void emitUserEvent('onboarding_start', { step, delta: 0 });
  }, [loading, step]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    if (key === 'phone' || (key === 'whatsappOptIn' && value === false)) {
      setPhoneError(null);
    }
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    setError(null);
  }, []);

  const toggleStudyDay = useCallback((day: Weekday) => {
    setForm((prev) => {
      const exists = prev.studyDays.includes(day);
      const nextDays = exists ? prev.studyDays.filter((d) => d !== day) : [...prev.studyDays, day];
      nextDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      return { ...prev, studyDays: nextDays };
    });
    setFieldErrors((prev) => {
      if (!('studyDays' in prev)) return prev;
      const { studyDays: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const persistStep = useCallback(
    async (payload: unknown) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        const nextStepValue = determineStep(parsed);
        setStep(nextStepValue);
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
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }, [loading, saving]);

  const validateStep = useCallback(
    (currentStep: StepId) => {
      const errors: FieldErrors = {};
      if (currentStep === 1) {
        if (!form.preferredLanguage) {
          errors.preferredLanguage = 'Pick a language to continue.';
        }
      }
      if (currentStep === 2) {
        const parsed = Number(form.goalBand);
        const isHalfStep = Math.abs(parsed * 2 - Math.round(parsed * 2)) < 0.001;
        if (Number.isNaN(parsed) || parsed < 4 || parsed > 9 || !isHalfStep) {
          errors.goalBand = 'Choose a band between 4.0 and 9.0 in 0.5 steps.';
        }
      }
      if (currentStep === 3 && form.examDate) {
        const parsedDate = new Date(form.examDate);
        if (Number.isNaN(parsedDate.getTime())) {
          errors.examDate = 'Enter a valid date.';
        }
      }
      if (currentStep === 4) {
        if (form.studyDays.length === 0) {
          errors.studyDays = 'Pick at least one study day.';
        }
        const minutes = Number(form.minutesPerDay);
        if (Number.isNaN(minutes) || minutes < 15 || minutes > 240) {
          errors.minutesPerDay = 'Set between 15 and 240 minutes.';
        }
      }
      if (currentStep === 5 && form.whatsappOptIn) {
        const trimmed = form.phone.trim();
        if (!phoneRegex.test(trimmed)) {
          errors.phone = 'Enter a valid international phone number.';
          setPhoneError('Enter a valid international phone number.');
        }
      }

      setFieldErrors(errors);
      return errors;
    },
    [form.examDate, form.goalBand, form.minutesPerDay, form.phone, form.preferredLanguage, form.studyDays, form.whatsappOptIn],
  );

  const handleNext = useCallback(async () => {
    if (loading || saving) return;
    const validationErrors = validateStep(step);
    if (Object.keys(validationErrors).length > 0) {
      setError('Please review the highlighted fields.');
      return;
    }

    const prev = step;

    try {
      if (step === 1) {
        const parsed = await persistStep({ step: 1, data: { preferredLanguage: form.preferredLanguage } });
        const nextStepValue = determineStep(parsed);
        const delta = Math.max(0, nextStepValue - prev);
        void emitUserEvent('onboarding_step_complete', { step: prev, delta });
        return;
      }

      if (step === 2) {
        const parsedGoal = Number(form.goalBand);
        const parsed = await persistStep({ step: 2, data: { goalBand: parsedGoal } });
        const nextStepValue = determineStep(parsed);
        const delta = Math.max(0, nextStepValue - prev);
        void emitUserEvent('onboarding_step_complete', { step: prev, delta });
        return;
      }

      if (step === 3) {
        const parsed = await persistStep({ step: 3, data: { examDate: form.examDate } });
        const nextStepValue = determineStep(parsed);
        const delta = Math.max(0, nextStepValue - prev);
        void emitUserEvent('onboarding_step_complete', { step: prev, delta });
        return;
      }

      if (step === 4) {
        const minutes = Number(form.minutesPerDay);
        const parsed = await persistStep({ step: 4, data: { studyDays: form.studyDays, minutesPerDay: minutes } });
        const nextStepValue = determineStep(parsed);
        const delta = Math.max(0, nextStepValue - prev);
        void emitUserEvent('onboarding_step_complete', { step: prev, delta });
        return;
      }

      const trimmedPhone = form.whatsappOptIn ? form.phone.trim() : '';
      const parsed = await persistStep({
        step: 5,
        data: {
          whatsappOptIn: form.whatsappOptIn,
          phone: trimmedPhone,
        },
      });

      if (parsed.onboardingComplete) {
        await markOnboardingComplete().catch(() => undefined);
        void emitUserEvent('onboarding_done', { step: prev, delta: 0 });
        await router.replace(nextPath);
        return;
      }

      const nextStepValue = determineStep(parsed);
      const delta = Math.max(0, nextStepValue - prev);
      void emitUserEvent('onboarding_step_complete', { step: prev, delta });
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unable to save onboarding step';
      setError(message);
    }
  }, [determineStep, form, loading, nextPath, persistStep, router, saving, step, validateStep]);

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
      nextLabel={saving ? 'Saving…' : step === TOTAL_ONBOARDING_STEPS ? 'Finish' : 'Continue'}
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
          fieldErrors={fieldErrors}
        />
      )}
    </StepShell>
  );
}

type StepContentProps = {
  step: StepId;
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleStudyDay: (day: Weekday) => void;
  phoneError: string | null;
  fieldErrors: FieldErrors;
};

function StepContent({ step, form, updateForm, toggleStudyDay, phoneError, fieldErrors }: StepContentProps) {
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
        {fieldErrors.preferredLanguage && (
          <p className="text-caption text-error">{fieldErrors.preferredLanguage}</p>
        )}
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
          error={fieldErrors.goalBand}
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
          error={fieldErrors.examDate}
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
          {fieldErrors.studyDays && <p className="mt-2 text-caption text-error">{fieldErrors.studyDays}</p>}
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
          error={fieldErrors.minutesPerDay}
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
          error={phoneError ?? fieldErrors.phone ?? undefined}
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
