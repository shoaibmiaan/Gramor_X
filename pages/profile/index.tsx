'use client';

import Head from 'next/head';
import Image from 'next/image';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Alert } from '@/components/design-system/Alert';
import { useToast } from '@/components/design-system/Toaster';
import { VocabInsightsCards } from '@/components/quiz/VocabInsightsCards';
import { useProfile } from '@/hooks/useProfile';
import { useStreak } from '@/hooks/useStreak';
import { useLocale } from '@/lib/locale';

export default function ProfilePage() {
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, longest, loading: streakLoading, shields } = useStreak();
  const {
    form,
    setField,
    loading,
    saving,
    error,
    fieldErrors,
    avatarUrl,
    languageOptions,
    initials,
    goToFullSetup,
    save,
  } = useProfile(t);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await save();

    if (result.ok) {
      toastSuccess(t('profile.save.ok', 'Profile updated'));
      return;
    }

    if (result.validationFailed) {
      toastError(t('profile.form.fix', 'Please fix the highlighted fields.'));
      return;
    }

    toastError(result.message ?? t('profile.save.fail', 'Unable to save your profile right now.'));
  };

  const currentStreak = streak ?? 0;
  const longestStreak = longest ?? 0;
  const shieldCount = typeof shields === 'number' ? shields : 0;

  if (loading) {
    return (
      <>
        <Head>
          <title>Profile · GramorX</title>
        </Head>
        <section className="py-12 bg-background text-foreground">
          <Container>
            <Card className="mx-auto max-w-xl rounded-ds-2xl p-6">
              {t('profile.loading', 'Loading your profile…')}
            </Card>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Profile · GramorX</title>
        <meta
          name="description"
          content="Manage your profile details, language, target band, and exam date for GramorX."
        />
      </Head>

      <section className="py-10 bg-background text-foreground">
        <Container>
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <Card className="flex flex-col gap-4 rounded-ds-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-14 sm:w-14">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={t('profile.photo.alt', 'Avatar')}
                      width={56}
                      height={56}
                      className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14"
                    />
                  ) : (
                    <span className="text-base font-semibold sm:text-lg">{initials}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {form.fullName || t('profile.name.placeholder', 'Your name')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      'profile.subtitle.compact',
                      'These settings power your study plan and AI feedback.',
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                  <span className="text-xs">🔥</span>
                  {streakLoading ? (
                    <span>{t('profile.streak.loading', 'Calculating streak…')}</span>
                  ) : (
                    <span>
                      {t('profile.streak.current', '{{days}} day streak', {
                        days: currentStreak,
                      })}
                      {longestStreak > 0 && (
                        <span className="ml-1 text-[10px] text-muted-foreground/80">
                          {t('profile.streak.longest', 'max {{days}}', { days: longestStreak })}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {shieldCount > 0 && (
                  <div className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                    {t('profile.shields.label', '{{count}} shield(s) left', {
                      count: shieldCount,
                    })}
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-ds-xl px-3 py-1 text-xs"
                  onClick={goToFullSetup}
                >
                  {t('profile.actions.fullSetup', 'Full setup')}
                </Button>
              </div>
            </Card>

            <VocabInsightsCards />

            {error && (
              <Alert variant="error" role="alert" className="rounded-ds-2xl">
                {error}
              </Alert>
            )}

            <Card className="rounded-ds-2xl p-5 sm:p-6">
              <form className="space-y-5" onSubmit={handleSave} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('profile.form.name.label', 'Full name')}
                    value={form.fullName}
                    onChange={(event) => setField('fullName', event.target.value)}
                    error={fieldErrors.fullName ?? null}
                    required
                  />
                  <Select
                    label={t('profile.form.language.label', 'Preferred language')}
                    value={form.preferredLanguage}
                    onChange={(event) => setField('preferredLanguage', event.target.value)}
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
                    value={form.targetBand}
                    onChange={(event) => setField('targetBand', event.target.value)}
                    error={fieldErrors.targetBand ?? null}
                    helperText={t('profile.form.band.helper', '4.0 – 9.0 in 0.5 steps')}
                  />
                  <Input
                    type="date"
                    label={t('profile.form.date.label', 'Exam date')}
                    value={form.examDate}
                    onChange={(event) => setField('examDate', event.target.value)}
                    error={fieldErrors.examDate ?? null}
                    helperText={t('profile.form.date.optional', 'Optional')}
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-ds-xl"
                    disabled={saving}
                  >
                    {saving
                      ? t('common.saving', 'Saving…')
                      : t('common.saveChanges', 'Save changes')}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
