'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Alert } from '@/components/design-system/Alert';
import { useToast } from '@/components/design-system/Toaster';
import { StreakCounter } from '@/components/streak/StreakCounter';
import { useStreak } from '@/hooks/useStreak';
import { fetchProfile, upsertProfile } from '@/lib/profile';
import type { Profile } from '@/types/profile';
import { languageOptions as onboardingLanguages } from '@/lib/onboarding/schema';
import { useLocale } from '@/lib/locale';

type FieldErrors = {
  fullName?: string;
  preferredLanguage?: string;
  goalBand?: string;
  examDate?: string;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ur: 'اردو',
};

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, longest, loading: streakLoading, shields } = useStreak();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [goalBand, setGoalBand] = useState('');
  const [examDate, setExamDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const languageOptions = useMemo(
    () =>
      onboardingLanguages.map((value) => ({
        value,
        label: LANGUAGE_LABELS[value] ?? value.toUpperCase(),
      })),
    [],
  );

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
        setFullName(nextProfile.full_name ?? '');
        setPreferredLanguage(nextProfile.preferred_language ?? 'en');
        setGoalBand(
          typeof nextProfile.goal_band === 'number'
            ? nextProfile.goal_band.toFixed(Number.isInteger(nextProfile.goal_band) ? 0 : 1)
            : '',
        );
        setExamDate(nextProfile.exam_date?.slice?.(0, 10) ?? '');
        setAvatarUrl(nextProfile.avatar_url ?? null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'Not authenticated') {
          await router.replace('/login');
          return;
        }
        console.error('Failed to load profile', err);
        setError(t('profile.load.error', 'Unable to load your profile right now.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const errors: FieldErrors = {};
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      errors.fullName = t('profile.form.name.required', 'Name is required.');
    }

    if (!preferredLanguage) {
      errors.preferredLanguage = t('profile.form.language.pick', 'Select a language.');
    } else if (!languageOptions.some((option) => option.value === preferredLanguage)) {
      errors.preferredLanguage = t('profile.form.language.supported', 'Select a supported language.');
    }

    let parsedGoal: number | null = null;
    if (goalBand.trim()) {
      parsedGoal = Number(goalBand);
      const isValidNumber = Number.isFinite(parsedGoal);
      const isInRange = parsedGoal >= 4 && parsedGoal <= 9;
      const isHalfStep = Math.abs(parsedGoal * 2 - Math.round(parsedGoal * 2)) < 0.001;
      if (!isValidNumber || !isInRange || !isHalfStep) {
        errors.goalBand = t(
          'profile.form.band.range',
          'Target band must be between 4.0 and 9.0 in 0.5 steps.',
        );
      }
    }

    if (examDate) {
      const parsedDate = new Date(examDate);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.examDate = t('profile.form.date.valid', 'Enter a valid exam date.');
      }
    }

    setFieldErrors(errors);
    return { isValid: Object.keys(errors).length === 0, parsedGoal, trimmedName };
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    const { isValid, parsedGoal, trimmedName } = validate();
    if (!isValid) {
      toastError(t('profile.form.fix', 'Please fix the highlighted fields.'));
      return;
    }

    setSaving(true);
    try {
      const updated = await upsertProfile({
        full_name: trimmedName,
        preferred_language: preferredLanguage,
        goal_band: parsedGoal ?? undefined,
        exam_date: examDate || null,
      });
      setProfile(updated);
      setFullName(updated.full_name ?? trimmedName);
      setPreferredLanguage(updated.preferred_language ?? preferredLanguage);
      setGoalBand(
        typeof updated.goal_band === 'number'
          ? updated.goal_band.toFixed(Number.isInteger(updated.goal_band) ? 0 : 1)
          : '',
      );
      setExamDate(updated.exam_date?.slice?.(0, 10) ?? '');
      setAvatarUrl(updated.avatar_url ?? avatarUrl ?? null);
      toastSuccess(t('profile.save.ok', 'Profile updated'));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('profile.save.fail', 'Unable to save your profile right now.');
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName.trim() ? fullName.trim()[0]!.toUpperCase() : 'U';

  if (loading) {
    return (
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="mx-auto max-w-xl rounded-ds-2xl p-6">{t('profile.loading', 'Loading…')}</Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <StreakCounter current={streak} longest={longest} loading={streakLoading} shields={shields} />

          {error && (
            <Alert variant="error" role="alert" className="rounded-ds-2xl">
              {error}
            </Alert>
          )}

          <Card className="rounded-ds-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-slab text-display">{t('profile.title', 'Profile')}</h1>
            </div>

            <form className="space-y-6" onSubmit={handleSave}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-electricBlue/10 text-electricBlue">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={t('profile.photo.alt', 'Avatar')}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-h2 font-semibold">{initials}</span>
                  )}
                </div>
                <p className="text-small text-mutedText">
                  {t(
                    'profile.subtitle',
                    'Manage your full profile, avatar, and study preferences from the setup screen.',
                  )}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('profile.form.name.label', 'Full name')}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  error={fieldErrors.fullName ?? null}
                  required
                />
                <Select
                  label={t('profile.form.language.label', 'Preferred language')}
                  value={preferredLanguage}
                  onChange={(event) => setPreferredLanguage(event.target.value)}
                  error={fieldErrors.preferredLanguage ?? null}
                  required
                >
                  <option value="" disabled>
                    {t('profile.form.language.select', 'Select language')}
                  </option>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  type="number"
                  label={t('profile.form.band.label', 'Target IELTS band')}
                  placeholder={t('profile.form.band.placeholder', 'e.g. 7.5')}
                  min={4}
                  max={9}
                  step={0.5}
                  value={goalBand}
                  onChange={(event) => setGoalBand(event.target.value)}
                  error={fieldErrors.goalBand ?? null}
                  helperText={t('profile.form.band.helper', '4.0 – 9.0 in 0.5 steps')}
                />
                <Input
                  type="date"
                  label={t('profile.form.date.label', 'Exam date')}
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  error={fieldErrors.examDate ?? null}
                  helperText={t('profile.form.date.optional', 'Optional')}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-ds-xl"
                  onClick={() => router.push('/profile/setup')}
                >
                  {t('profile.actions.fullSetup', 'Open full setup')}
                </Button>
                <Button type="submit" variant="primary" className="rounded-ds-xl" disabled={saving}>
                  {saving ? t('common.saving', 'Saving…') : t('common.saveChanges', 'Save changes')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </section>
  );
}
