'use client';

import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import type { UserOnboarding } from '@/lib/onboarding';

type FormValues = Partial<UserOnboarding>;

type StepProps = {
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  watch: UseFormWatch<FormValues>;
  errors: FieldErrors<FormValues>;
};

export function StepWelcome() {
  return <p className="text-sm text-slate-600">Welcome to GramorX. Let&apos;s set up your account.</p>;
}

export function StepFullName({ register, errors }: StepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <input className="w-full rounded border p-2" placeholder="First name" {...register('first_name')} />
        <p className="text-xs text-red-600">{errors.first_name?.message as string | undefined}</p>
      </div>
      <div>
        <input className="w-full rounded border p-2" placeholder="Last name" {...register('last_name')} />
        <p className="text-xs text-red-600">{errors.last_name?.message as string | undefined}</p>
      </div>
    </div>
  );
}

export function StepUsername({ register, errors }: StepProps) {
  return (
    <div>
      <input className="w-full rounded border p-2" placeholder="Username" {...register('username')} />
      <p className="text-xs text-red-600">{errors.username?.message as string | undefined}</p>
    </div>
  );
}

export function StepCountry({ register, errors }: StepProps) {
  return (
    <div>
      <input className="w-full rounded border p-2" placeholder="Country" {...register('country')} />
      <p className="text-xs text-red-600">{errors.country?.message as string | undefined}</p>
    </div>
  );
}

export function StepNativeLanguage({ register, errors }: StepProps) {
  return (
    <div>
      <input className="w-full rounded border p-2" placeholder="Native language" {...register('native_language')} />
      <p className="text-xs text-red-600">{errors.native_language?.message as string | undefined}</p>
    </div>
  );
}

export function StepTargetBand({ register, errors }: StepProps) {
  return (
    <div>
      <select className="w-full rounded border p-2" {...register('target_band', { valueAsNumber: true })}>
        <option value="">Select target band</option>
        {[5, 6, 7, 8, 9].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <p className="text-xs text-red-600">{errors.target_band?.message as string | undefined}</p>
    </div>
  );
}

export function StepEnglishLevel({ register, errors }: StepProps) {
  return (
    <div>
      <select className="w-full rounded border p-2" {...register('english_level')}>
        <option value="">Select level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <p className="text-xs text-red-600">{errors.english_level?.message as string | undefined}</p>
    </div>
  );
}

export function StepTestDate({ register, errors }: StepProps) {
  return (
    <div>
      <input type="date" className="w-full rounded border p-2" {...register('test_date')} />
      <p className="text-xs text-red-600">{errors.test_date?.message as string | undefined}</p>
    </div>
  );
}

export function StepGoalType({ register, errors }: StepProps) {
  return (
    <div>
      <select className="w-full rounded border p-2" {...register('goal_type')}>
        <option value="">Select goal</option>
        <option value="immigration">Immigration</option>
        <option value="university">University</option>
        <option value="job">Job</option>
        <option value="general improvement">General improvement</option>
      </select>
      <p className="text-xs text-red-600">{errors.goal_type?.message as string | undefined}</p>
    </div>
  );
}

export function StepDailyTime({ register, errors }: StepProps) {
  return (
    <div>
      <select className="w-full rounded border p-2" {...register('daily_study_minutes')}>
        <option value="">Select time</option>
        <option value="15">15</option>
        <option value="30">30</option>
        <option value="60">60</option>
        <option value="120+">120+</option>
      </select>
      <p className="text-xs text-red-600">{errors.daily_study_minutes?.message as string | undefined}</p>
    </div>
  );
}

export function StepSkillFocus({ watch, setValue, errors }: StepProps) {
  const selected = watch('skill_focus') ?? [];
  const skills: Array<'reading' | 'writing' | 'speaking' | 'listening' | 'grammar' | 'vocabulary'> = [
    'reading',
    'writing',
    'speaking',
    'listening',
    'grammar',
    'vocabulary',
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {skills.map((skill) => (
        <label key={skill} className="flex items-center gap-2 rounded border p-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(skill)}
            onChange={(e) => {
              const next = e.target.checked
                ? [...selected, skill]
                : selected.filter((value) => value !== skill);
              setValue('skill_focus', next, { shouldValidate: true });
            }}
          />
          {skill}
        </label>
      ))}
      <p className="col-span-2 text-xs text-red-600">{errors.skill_focus?.message as string | undefined}</p>
    </div>
  );
}

export function StepFinish() {
  return <p className="text-sm text-slate-600">Setup complete. Click Finish to open your dashboard.</p>;
}
