import type { Profile } from '@/types/profile';
import { supabaseBrowser } from './supabaseBrowser';

export type ProfileProgress = Pick<Profile, 'onboarding_step' | 'onboarding_complete'>;

type ProfilePatch = Partial<Profile> & Partial<ProfileProgress>;

type SupabaseProfile = Profile & { id?: string; user_id?: string };

export type ProfileFieldErrors = {
  fullName?: string;
  preferredLanguage?: string;
  targetBand?: string;
  examDate?: string;
};

export type ProfileLanguageOption = { value: string; label: string };

export type ProfileFormValues = {
  fullName: string;
  preferredLanguage: string;
  targetBand: string;
  examDate: string;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ur: 'اردو',
};

type OnboardingLanguageOption = { value: string; label?: string };

function sanitizePatch(patch: ProfilePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

async function getSessionUserId(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export async function fetchProfile(): Promise<SupabaseProfile | null> {
  const userId = await getSessionUserId();
  const query = supabaseBrowser
    .from('profiles')
    .select('*')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') throw error;
  return (data as SupabaseProfile | null) ?? null;
}

export async function upsertProfile(patch: ProfilePatch): Promise<SupabaseProfile> {
  const userId = await getSessionUserId();
  const payload = { user_id: userId, ...sanitizePatch(patch) };

  const { data, error } = await supabaseBrowser
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data as SupabaseProfile;
}

export async function markOnboardingComplete(): Promise<void> {
  await getSessionUserId();
  await supabaseBrowser.auth.updateUser({ data: { onboarding_complete: true } });
}

export function buildLanguageOptions(onboardingLanguages: unknown): ProfileLanguageOption[] {
  if (
    Array.isArray(onboardingLanguages) &&
    onboardingLanguages.length > 0 &&
    typeof onboardingLanguages[0] === 'string'
  ) {
    return (onboardingLanguages as string[]).map((value) => ({
      value,
      label: LANGUAGE_LABELS[value] ?? value.toUpperCase(),
    }));
  }

  if (
    Array.isArray(onboardingLanguages) &&
    onboardingLanguages.length > 0 &&
    typeof onboardingLanguages[0] === 'object' &&
    onboardingLanguages[0] !== null &&
    'value' in (onboardingLanguages[0] as OnboardingLanguageOption)
  ) {
    return (onboardingLanguages as OnboardingLanguageOption[]).map((opt) => ({
      value: opt.value,
      label: LANGUAGE_LABELS[opt.value] ?? opt.label ?? opt.value.toUpperCase(),
    }));
  }

  return ['en', 'ur'].map((value) => ({
    value,
    label: LANGUAGE_LABELS[value] ?? value.toUpperCase(),
  }));
}

export function formatTargetBand(targetBand: number | null | undefined): string {
  if (typeof targetBand !== 'number') return '';
  return targetBand.toFixed(Number.isInteger(targetBand) ? 0 : 1);
}

export function toProfileFormValues(profile: SupabaseProfile | null): ProfileFormValues {
  return {
    fullName: profile?.full_name ?? '',
    preferredLanguage: profile?.preferred_language ?? 'en',
    targetBand: formatTargetBand(profile?.target_band),
    examDate: profile?.exam_date?.slice?.(0, 10) ?? '',
  };
}

export function getProfileInitials(fullName: string): string {
  return fullName.trim() ? fullName.trim()[0]!.toUpperCase() : 'U';
}

export function validateProfileForm(
  values: ProfileFormValues,
  languageOptions: ProfileLanguageOption[],
  t: (key: string, fallback: string) => string,
): {
  isValid: boolean;
  parsedTarget: number | null;
  trimmedName: string;
  errors: ProfileFieldErrors;
} {
  const errors: ProfileFieldErrors = {};
  const trimmedName = values.fullName.trim();

  if (!trimmedName) {
    errors.fullName = t('profile.form.name.required', 'Name is required.');
  }

  if (!values.preferredLanguage) {
    errors.preferredLanguage = t('profile.form.language.pick', 'Select a language.');
  } else if (!languageOptions.some((option) => option.value === values.preferredLanguage)) {
    errors.preferredLanguage = t('profile.form.language.supported', 'Select a supported language.');
  }

  let parsedTarget: number | null = null;
  if (values.targetBand.trim()) {
    parsedTarget = Number(values.targetBand);
    const isValidNumber = Number.isFinite(parsedTarget);
    const isInRange = parsedTarget >= 4 && parsedTarget <= 9;
    const isHalfStep = Math.abs(parsedTarget * 2 - Math.round(parsedTarget * 2)) < 0.001;

    if (!isValidNumber || !isInRange || !isHalfStep) {
      errors.targetBand = t(
        'profile.form.band.range',
        'Target band must be between 4.0 and 9.0 in 0.5 steps.',
      );
    }
  }

  if (values.examDate) {
    const parsedDate = new Date(values.examDate);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.examDate = t('profile.form.date.valid', 'Enter a valid exam date.');
    } else if (parsedDate < new Date()) {
      errors.examDate = t('profile.form.date.future', 'Exam date must be in the future.');
    }
  }

  return { isValid: Object.keys(errors).length === 0, parsedTarget, trimmedName, errors };
}
