import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import StepShell from '@/components/onboarding/StepShell';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
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
import { useLocale } from '@/lib/locale';

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

const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const dayOrder = [...weekdayOptions];

const quickBands = ['6.5', '7.0', '7.5', '8.0'] as const;

export default function OnboardingWizard() {
  const router = useRouter();
  const { t } = useLocale();

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
      { label: t('onboarding.step.label.language', 'Language'), done: (profileState?.onboardingStep ?? 0) >= 1 },
      { label: t('onboarding.step.label.band', 'Target band'), done: (profileState?.onboardingStep ?? 0) >= 2 },
      { label: t('onboarding.step.label.date', 'Exam date'), done: (profileState?.onboardingStep ?? 0) >= 3 },
      { label: t('onboarding.step.label.rhythm', 'Study rhythm'), done: (profileState?.onboardingStep ?? 0) >= 4 },
      { label: t('onboarding.step.label.notify', 'Notifications'), done: profileState?.onboardingComplete === true },
    ],
    [profileState?.onboardingComplete, profileState?.onboardingStep, t],
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
          const message = typeof body?.error === 'string' ? body.error : t('onboarding.errors.loadProfile', 'Unable to load onboarding data');
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
        const message = err instanceof Error ? err.message : t('onboarding.errors.loadProfile', 'Unable to load onboarding data');
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [determineStep, nextPath, router, syncForm, t]);

  useEffect(() => {
    if (loading || startTracked.current) return;
    startTracked.current = true;
    void emitUserEvent('onboarding_start', { step, delta: 0 });
  }, [loading, step]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'phone' || (key === 'whatsappOptIn' && value === false)) setPhoneError(null);
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
          const message = typeof body?.error === 'string' ? body.error : t('onboarding.errors.saveGeneric', 'Unable to save onboarding step');
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
    [determineStep, nextPath, router, syncForm, t],
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
        if (!form.preferredLanguage) errors.preferredLanguage = t('onboarding.errors.pickLanguage', 'Pick a language to continue.');
      }
      if (currentStep === 2) {
        const parsed = Number(form.goalBand);
        const isHalfStep = Math.abs(parsed * 2 - Math.round(parsed * 2)) < 0.001;
        if (Number.isNaN(parsed) || parsed < 4 || parsed > 9 || !isHalfStep) {
          errors.goalBand = t('onboarding.errors.bandRange', 'Choose a band between 4.0 and 9.0 in 0.5 steps.');
        }
      }
      if (currentStep === 3 && form.examDate) {
        const parsedDate = new Date(form.examDate);
        if (Number.isNaN(parsedDate.getTime())) errors.examDate = t('onboarding.errors.dateInvalid', 'Enter a valid date.');
      }
      if (currentStep === 4) {
        if (form.studyDays.length === 0) errors.studyDays = t('onboarding.errors.studyDays', 'Pick at least one study day.');
        const minutes = Number(form.minutesPerDay);
        if (Number.isNaN(minutes) || minutes < 15 || minutes > 240) {
          errors.minutesPerDay = t('onboarding.errors.minutes', 'Set between 15 and 240 minutes.');
        }
      }
      if (currentStep === 5 && form.whatsappOptIn) {
        const trimmed = form.phone.trim();
        if (!phoneRegex.test(trimmed)) {
          errors.phone = t('onboarding.errors.invalidPhone', 'Enter a valid international phone number.');
          setPhoneError(errors.phone);
        }
      }
      setFieldErrors(errors);
      return errors;
    },
    [form, t],
  );

  const handleNext = useCallback(async () => {
    if (loading || saving) return;
    const validationErrors = validateStep(step);
    if (Object.keys(validationErrors).length > 0) {
      setError(t('onboarding.errors.review', 'Please review the highlighted fields.'));
      return;
    }
    const prev = step;
    try {
      if (step === 1) {
        const parsed = await persistStep({ step: 1, data: { preferredLanguage: form.preferredLanguage } });
        const nextStepValue = determineStep(parsed);
        void emitUserEvent('onboarding_step_complete', { step: prev, delta: Math.max(0, nextStepValue - prev) });
        return;
      }
      if (step === 2) {
        const parsedGoal = Number(form.goalBand);
        const parsed = await persistStep({ step: 2, data: { goalBand: parsedGoal } });
        void emitUserEvent('onboarding_step_complete', { step: prev, delta: Math.max(0, determineStep(parsed) - prev) });
        return;
      }
      if (step === 3) {
        const parsed = await persistStep({ step: 3, data: { examDate: form.examDate } });
        void emitUserEvent('onboarding_step_complete', { step: prev, delta: Math.max(0, determineStep(parsed) - prev) });
        return;
      }
      if (step === 4) {
        const minutes = Number(form.minutesPerDay);
        const parsed = await persistStep({ step: 4, data: { studyDays: form.studyDays, minutesPerDay: minutes } });
        void emitUserEvent('onboarding_step_complete', { step: prev, delta: Math.max(0, determineStep(parsed) - prev) });
        return;
      }
      const trimmedPhone = form.whatsappOptIn ? form.phone.trim() : '';
      const parsed = await persistStep({ step: 5, data: { whatsappOptIn: form.whatsappOptIn, phone: trimmedPhone } });
      if (parsed.onboardingComplete) {
        await markOnboardingComplete().catch(() => undefined);
        void emitUserEvent('onboarding_done', { step: prev, delta: 0 });
        await router.replace(nextPath);
        return;
      }
      void emitUserEvent('onboarding_step_complete', { step: prev, delta: Math.max(0, determineStep(parsed) - prev) });
    } catch (err) {
      if (err instanceof Error && err.message === 'Not authenticated') return;
      const message = err instanceof Error ? err.message : t('onboarding.errors.saveGeneric', 'Unable to save onboarding step');
      setError(message);
    }
  }, [determineStep, form, loading, nextPath, persistStep, router, saving, step, t, validateStep]);

  const copy = [
    {
      title: t('onboarding.copy.language.title', 'Pick your learning language'),
      subtitle: t('onboarding.copy.language.subtitle', 'We’ll translate prompts, reminders, and nudges so everything feels familiar.'),
      hint: t('onboarding.copy.language.hint', 'You can switch languages later from Settings → Preferences.'),
    },
    {
      title: t('onboarding.copy.band.title', 'Set your target band'),
      subtitle: t('onboarding.copy.band.subtitle', 'A clear goal helps us pace mocks, AI feedback, and review sessions.'),
    },
    {
      title: t('onboarding.copy.date.title', 'When is your IELTS exam?'),
      subtitle: t('onboarding.copy.date.subtitle', 'We’ll reverse-engineer the study plan so you peak near test day.'),
    },
    {
      title: t('onboarding.copy.rhythm.title', 'Shape your weekly rhythm'),
      subtitle: t('onboarding.copy.rhythm.subtitle', 'Tell us when you can put in focused time so we can schedule smarter.'),
      hint: t('onboarding.copy.rhythm.hint', 'We’ll schedule AI-graded tasks and mocks on the days you pick.'),
    },
    {
      title: t('onboarding.copy.whatsapp.title', 'Stay on track with WhatsApp'),
      subtitle: t('onboarding.copy.whatsapp.subtitle', 'Opt in for gentle reminders and quick wins (totally optional).'),
      hint: t('onboarding.copy.whatsapp.hint', 'We send at most three nudges per week and you can opt out anytime.'),
    },
  ][step - 1];

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
      nextLabel={saving ? t('onboarding.buttons.saving', 'Saving…') : step === TOTAL_ONBOARDING_STEPS ? t('onboarding.buttons.finish', 'Finish') : t('onboarding.buttons.continue', 'Continue')}
      nextDisabled={saving || loading}
    >
      {error && (
        <Alert variant="error" className="mb-4" role="alert">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : (
        <StepContent
          step={step}
          form={form}
          updateForm={updateForm}
          toggleStudyDay={toggleStudyDay}
          phoneError={phoneError}
          fieldErrors={fieldErrors}
          t={t}
        />
      )}
    </StepShell>
  );
}

function StepContent({
  step,
  form,
  updateForm,
  toggleStudyDay,
  phoneError,
  fieldErrors,
  t,
}: {
  step: StepId;
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleStudyDay: (day: Weekday) => void;
  phoneError: string | null;
  fieldErrors: FieldErrors;
  t: typeof import('@/lib/locale').t;
}) {
  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-small text-mutedText">
          {t('onboarding.lang.pick', 'Pick the language that feels most comfortable for instructions and reminders.')}
        </p>
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
        {fieldErrors.preferredLanguage && <p className="text-caption text-error">{fieldErrors.preferredLanguage}</p>}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <Input
          type="number"
          label={t('onboarding.band.inputLabel', 'Target overall band')}
          min={4}
          max={9}
          step={0.5}
          value={form.goalBand}
          onChange={(event) => updateForm('goalBand', event.target.value)}
          helperText={t('onboarding.band.helper', 'Most universities aim for 6.5–7.0. Setting your target 0.5 higher gives breathing room.')}
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
          label={t('onboarding.date.inputLabel', 'IELTS exam date')}
          value={form.examDate}
          onChange={(event) => updateForm('examDate', event.target.value)}
          helperText={t('onboarding.date.helper', 'Leave blank if you haven’t booked yet—we’ll suggest a four-week ramp.')}
          error={fieldErrors.examDate}
        />
        <p className="text-small text-mutedText">
          {t('onboarding.date.tip', 'We’ll pace mocks, AI-evaluated writing, and speaking drills so you peak near your exam.')}
        </p>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-small text-mutedText">
            {t('onboarding.rhythm.pickDays', 'Which days can you reliably dedicate to IELTS prep?')}
          </p>
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
          label={t('onboarding.minutes.label', 'Minutes per study day')}
          min={15}
          max={240}
          step={5}
          value={form.minutesPerDay}
          onChange={(event) => updateForm('minutesPerDay', event.target.value)}
          helperText={t('onboarding.minutes.helper', 'We recommend at least 45 focused minutes. Your plan will adapt to this budget.')}
          error={fieldErrors.minutesPerDay}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        type="checkbox"
        asChild
        label={t('onboarding.whatsapp.optInTitle', 'Send me WhatsApp nudges')}
      />
      <div className="text-small text-mutedText">
        {t('onboarding.whatsapp.optInDescription', '2–3 gentle reminders per week with prompts, checklists, and next steps.')}
      </div>

      {form.whatsappOptIn ? (
        <Input
          label={t('onboarding.whatsapp.phoneLabel', 'WhatsApp number')}
          placeholder={t('onboarding.whatsapp.placeholder', '+14155552671')}
          value={form.phone}
          onChange={(event) => updateForm('phone', event.target.value)}
          helperText={t('onboarding.whatsapp.helper', 'Use your full international number including country code.')}
          error={phoneError ?? fieldErrors.phone ?? undefined}
        />
      ) : (
        <p className="text-small text-mutedText">
          {t('onboarding.whatsapp.emailFallback', 'Prefer email? Enable WhatsApp reminders later from Settings → Notifications.')}
        </p>
      )}
    </div>
  );
}
