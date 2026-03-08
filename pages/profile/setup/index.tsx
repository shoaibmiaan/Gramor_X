// pages/profile/setup.tsx
'use client';

import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Alert } from '@/components/design-system/Alert';
import { useToast } from '@/components/design-system/Toaster';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { useLocale } from '@/lib/locale';
import { languageOptions as onboardingLanguages } from '@/lib/onboarding/schema';

type FieldErrors = {
  fullName?: string;
  preferredLanguage?: string;
  targetBand?: string;
  examDate?: string;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ur: 'اردو',
};

type OnboardingLanguageOption = { value: string; label?: string };


const deriveNameFromEmail = (email: string | null | undefined): string => {
  if (!email) return '';

  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return '';

  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();

  const [fullName, setFullName] = React.useState('');
  const [preferredLanguage, setPreferredLanguage] = React.useState('en');
  const [targetBand, setTargetBand] = React.useState('');
  const [examDate, setExamDate] = React.useState('');

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  // Check if profile already exists and redirect if completed
  React.useEffect(() => {
    let mounted = true;

    const checkProfile = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          router.replace('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();

        if (mounted) {
          // If profile exists and is not a draft, redirect to profile page
          if (profile && !profile.draft) {
            router.replace('/profile');
            return;
          }

          // Pre-fill if any data exists
          if (profile) {
            const emailFallback = deriveNameFromEmail(sessionData.session.user.email);
            setFullName(profile.full_name?.trim() ? profile.full_name : emailFallback);
            setPreferredLanguage(profile.preferred_language ?? 'en');
            setTargetBand(
              typeof profile.target_band === 'number'
                ? profile.target_band.toFixed(Number.isInteger(profile.target_band) ? 0 : 1)
                : ''
            );
            setExamDate(profile.exam_date?.slice?.(0, 10) ?? '');
          } else {
            setFullName(deriveNameFromEmail(sessionData.session.user.email));
          }
        }
      } catch (err) {
        console.error('Failed to check profile:', err);
        if (mounted) setError(t('setup.error.check', 'Failed to load profile data.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkProfile();

    return () => {
      mounted = false;
    };
  }, [router, t]);

  const languageOptions = React.useMemo(() => {
    const src = onboardingLanguages as unknown;

    if (Array.isArray(src) && src.length > 0 && typeof src[0] === 'string') {
      return (src as string[]).map((value) => ({
        value,
        label: LANGUAGE_LABELS[value] ?? value.toUpperCase(),
      }));
    }

    if (
      Array.isArray(src) &&
      src.length > 0 &&
      typeof src[0] === 'object' &&
      src[0] !== null &&
      'value' in (src[0] as OnboardingLanguageOption)
    ) {
      return (src as OnboardingLanguageOption[]).map((opt) => ({
        value: opt.value,
        label: LANGUAGE_LABELS[opt.value] ?? opt.label ?? opt.value.toUpperCase(),
      }));
    }

    return ['en', 'ur'].map((value) => ({
      value,
      label: LANGUAGE_LABELS[value] ?? value.toUpperCase(),
    }));
  }, []);

  const validate = () => {
    const errors: FieldErrors = {};
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      errors.fullName = t('setup.form.name.required', 'Name is required.');
    }

    if (!preferredLanguage) {
      errors.preferredLanguage = t('setup.form.language.pick', 'Select a language.');
    } else if (!languageOptions.some((option) => option.value === preferredLanguage)) {
      errors.preferredLanguage = t(
        'setup.form.language.supported',
        'Select a supported language.'
      );
    }

    let parsedTarget: number | null = null;
    if (targetBand.trim()) {
      parsedTarget = Number(targetBand);
      const isValidNumber = Number.isFinite(parsedTarget);
      const isInRange = parsedTarget >= 4 && parsedTarget <= 9;
      const isHalfStep = Math.abs(parsedTarget * 2 - Math.round(parsedTarget * 2)) < 0.001;

      if (!isValidNumber || !isInRange || !isHalfStep) {
        errors.targetBand = t(
          'setup.form.band.range',
          'Target band must be between 4.0 and 9.0 in 0.5 steps.'
        );
      }
    }

    if (examDate) {
      const parsedDate = new Date(examDate);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.examDate = t('setup.form.date.valid', 'Enter a valid exam date.');
      } else if (parsedDate < new Date()) {
        errors.examDate = t('setup.form.date.future', 'Exam date must be in the future.');
      }
    }

    setFieldErrors(errors);
    return { isValid: Object.keys(errors).length === 0, parsedTarget, trimmedName };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { isValid, parsedTarget, trimmedName } = validate();
    if (!isValid) {
      toastError(t('setup.form.fix', 'Please fix the highlighted fields.'));
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) throw new Error('Not authenticated');

      const updates = {
        id: sessionData.session.user.id,
        full_name: trimmedName,
        preferred_language: preferredLanguage,
        target_band: parsedTarget ?? null,
        exam_date: examDate || null,
        draft: false, // Mark as complete
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from('profiles').upsert(updates);

      if (upsertError) throw upsertError;

      toastSuccess(t('setup.success', 'Profile setup complete!'));
      router.push('/profile');
    } catch (err) {
      console.error('Setup error:', err);
      toastError(t('setup.error.save', 'Failed to save profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('setup.pageTitle', 'Set Up Your Profile · GramorX')}</title>
        </Head>
        <section className="py-12 bg-background text-foreground">
          <Container>
            <Card className="mx-auto max-w-xl rounded-ds-2xl p-6">
              <p>{t('common.loading', 'Loading...')}</p>
            </Card>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t('setup.pageTitle', 'Set Up Your Profile · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'setup.pageDescription',
            'Complete your profile to personalize your study plan and get accurate feedback.'
          )}
        />
      </Head>

      <section className="py-12 bg-background text-foreground">
        <Container>
          <div className="mx-auto max-w-xl space-y-6">
            <header className="space-y-2">
              <h1 className="text-h2 font-bold">{t('setup.title', 'Finish setting up your profile')}</h1>
              <p className="text-small text-muted-foreground">
                {t(
                  'setup.subtitle',
                  'Tell us a bit about yourself so we can tailor your study plan and feedback.'
                )}
              </p>
            </header>

            {error && (
              <Alert variant="error" role="alert">
                {error}
              </Alert>
            )}

            <Card className="rounded-ds-2xl p-6">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid gap-4">
                  <Input
                    label={t('setup.form.name.label', 'Full name')}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    error={fieldErrors.fullName ?? null}
                    required
                  />
                  <Select
                    label={t('setup.form.language.label', 'Preferred language')}
                    value={preferredLanguage}
                    onChange={(event) => setPreferredLanguage(event.target.value)}
                    error={fieldErrors.preferredLanguage ?? null}
                    required
                  >
                    <option value="" disabled>
                      {t('setup.form.language.select', 'Select language')}
                    </option>
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-4">
                  <Input
                    type="number"
                    label={t('setup.form.band.label', 'Target IELTS band')}
                    placeholder={t('setup.form.band.placeholder', 'e.g. 7.5')}
                    min={4}
                    max={9}
                    step={0.5}
                    value={targetBand}
                    onChange={(event) => setTargetBand(event.target.value)}
                    error={fieldErrors.targetBand ?? null}
                    helperText={t('setup.form.band.helper', '4.0 – 9.0 in 0.5 steps')}
                  />
                  <Input
                    type="date"
                    label={t('setup.form.date.label', 'Exam date (optional)')}
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                    error={fieldErrors.examDate ?? null}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push('/')}
                  >
                    {t('common.skip', 'Skip for now')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={saving}
                  >
                    {saving ? t('common.saving', 'Saving…') : t('setup.submit', 'Complete setup')}
                  </Button>
                </div>
              </form>
            </Card>

            <p className="text-center text-caption text-muted-foreground">
              {t(
                'setup.privacy',
                'Your information is used only to personalize your experience. See our {{privacyLink}}.',
                {
                  privacyLink: (
                    <Link href="/legal/privacy" className="underline">
                      {t('footer.privacy', 'Privacy Policy')}
                    </Link>
                  ),
                }
              )}
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}