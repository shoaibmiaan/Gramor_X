import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import { languageOptions as onboardingLanguages } from '@/lib/onboarding/schema';
import {
  buildLanguageOptions,
  fetchProfile,
  formatTargetBand,
  type ProfileFieldErrors,
  type ProfileFormValues,
  getProfileInitials,
  toProfileFormValues,
  upsertProfile,
  validateProfileForm,
} from '@/lib/profile';
import type { Profile } from '@/types/profile';

export function useProfile(t: (key: string, fallback: string) => string) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileFormValues>({
    fullName: '',
    preferredLanguage: 'en',
    targetBand: '',
    examDate: '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  const languageOptions = useMemo(() => buildLanguageOptions(onboardingLanguages as unknown), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const nextProfile = await fetchProfile();
        if (cancelled) return;

        if (!nextProfile || nextProfile.draft) {
          await router.replace('/profile/setup');
          return;
        }

        setProfile(nextProfile);
        setForm(toProfileFormValues(nextProfile));
        setAvatarUrl(nextProfile.avatar_url ?? null);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof Error && err.message === 'Not authenticated') {
          await router.replace('/login');
          return;
        }

        setError(t('profile.load.error', 'Unable to load your profile right now.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  const setField = (field: keyof ProfileFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!profile) return { ok: false } as const;

    const { isValid, parsedTarget, trimmedName, errors } = validateProfileForm(
      form,
      languageOptions,
      t,
    );

    setFieldErrors(errors);
    if (!isValid) {
      return { ok: false, validationFailed: true } as const;
    }

    setSaving(true);
    try {
      const updated = await upsertProfile({
        full_name: trimmedName,
        preferred_language: form.preferredLanguage,
        target_band: parsedTarget ?? undefined,
        exam_date: form.examDate || null,
      });

      setProfile(updated);
      setForm({
        fullName: updated.full_name ?? trimmedName,
        preferredLanguage: updated.preferred_language ?? form.preferredLanguage,
        targetBand: formatTargetBand(updated.target_band),
        examDate: updated.exam_date?.slice?.(0, 10) ?? '',
      });
      setAvatarUrl(updated.avatar_url ?? avatarUrl ?? null);

      return { ok: true } as const;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('profile.save.fail', 'Unable to save your profile right now.');
      return { ok: false, message } as const;
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setField,
    loading,
    saving,
    error,
    fieldErrors,
    avatarUrl,
    languageOptions,
    initials: getProfileInitials(form.fullName),
    goToFullSetup: () => router.push('/profile/setup'),
    save,
  };
}
