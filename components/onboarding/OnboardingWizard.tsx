'use client';

import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useOnboarding } from '@/hooks/useOnboarding';
import { stepSchemas, TOTAL_ONBOARDING_STEPS, type UserOnboarding } from '@/lib/onboarding';
import {
  StepCountry,
  StepDailyTime,
  StepEnglishLevel,
  StepFinish,
  StepFullName,
  StepGoalType,
  StepNativeLanguage,
  StepSkillFocus,
  StepTargetBand,
  StepTestDate,
  StepUsername,
  StepWelcome,
} from './steps';

const TITLES = [
  'Welcome',
  'Full Name',
  'Username',
  'Country',
  'Native Language',
  'Target IELTS Band',
  'Current English Level',
  'Test Date',
  'Study Goal',
  'Study Time Per Day',
  'Skill Focus',
  'Finish Setup',
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { state, loading, saving, saveStep, finish } = useOnboarding();
  const [uiStep, setUiStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Partial<UserOnboarding>>({ defaultValues: {} });

  useEffect(() => {
    if (!state) return;
    form.reset(state);
    setUiStep(state.current_step ?? 1);
    if (state.onboarding_completed) {
      void router.replace('/dashboard');
    }
  }, [form, router, state]);

  const progress = useMemo(() => Math.round(((uiStep - 1) / TOTAL_ONBOARDING_STEPS) * 100), [uiStep]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    if (uiStep === 12) {
      try {
        await finish();
        await router.replace('/dashboard');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to finish onboarding.');
      }
      return;
    }

    const schema = stepSchemas[uiStep as keyof typeof stepSchemas];
    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input.');
      return;
    }

    try {
      const next = await saveStep({ step: uiStep, data: parsed.data });
      setUiStep(next.current_step);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save progress.');
    }
  });

  const goBack = () => {
    setError(null);
    setUiStep((prev) => Math.max(1, prev - 1));
  };

  if (loading || !state) return <div className="p-6">Loading onboarding…</div>;

  const stepProps = {
    register: form.register,
    setValue: form.setValue,
    watch: form.watch,
    errors: form.formState.errors,
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>
            Step {uiStep} / {TOTAL_ONBOARDING_STEPS}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <h1 className="mb-4 text-xl font-semibold">{TITLES[uiStep - 1]}</h1>

      <form className="space-y-4" onSubmit={onSubmit}>
        {uiStep === 1 && <StepWelcome />}
        {uiStep === 2 && <StepFullName {...stepProps} />}
        {uiStep === 3 && <StepUsername {...stepProps} />}
        {uiStep === 4 && <StepCountry {...stepProps} />}
        {uiStep === 5 && <StepNativeLanguage {...stepProps} />}
        {uiStep === 6 && <StepTargetBand {...stepProps} />}
        {uiStep === 7 && <StepEnglishLevel {...stepProps} />}
        {uiStep === 8 && <StepTestDate {...stepProps} />}
        {uiStep === 9 && <StepGoalType {...stepProps} />}
        {uiStep === 10 && <StepDailyTime {...stepProps} />}
        {uiStep === 11 && <StepSkillFocus {...stepProps} />}
        {uiStep === 12 && <StepFinish />}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between">
          <button type="button" onClick={goBack} className="rounded border px-4 py-2" disabled={saving || uiStep <= 1}>
            Back
          </button>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving}>
            {saving ? 'Saving...' : uiStep === 12 ? 'Finish' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
