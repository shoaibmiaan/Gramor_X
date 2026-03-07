// pages/settings/language.tsx
import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useLocale } from '@/lib/locale';
import { loadTranslations, getLocale, setLocale as setAppLocale } from '@/lib/i18n';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { SupportedLocale } from '@/lib/i18n/config';

interface LanguageOption {
  value: SupportedLocale;
  label: string;
  flag?: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ur', label: 'اردو', flag: '🇵🇰' },
];

export default function LanguageSettingsPage() {
  const router = useRouter();
  const { t, locale: currentLocale } = useLocale();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [selectedLocale, setSelectedLocale] = React.useState<SupportedLocale>(currentLocale);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Load initial data
  React.useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get current session
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;

        setUserId(data.session?.user?.id ?? null);

        // Ensure translations are loaded for current locale
        await loadTranslations(currentLocale);
        setSelectedLocale(currentLocale);
      } catch (err) {
        console.error('Failed to initialize language page:', err);
        setError(t('language.error.init', 'Failed to load language settings.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [currentLocale, t]);

  const handleChange = async (locale: SupportedLocale) => {
    if (locale === selectedLocale) return;

    setSelectedLocale(locale);
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Load translations for new locale
      await loadTranslations(locale);

      // Persist to cookie/localStorage
      setAppLocale(locale);

      // If user is logged in, update profile
      if (userId) {
        const { error: updateError } = await supabaseBrowser
          .from('profiles')
          .update({ preferred_language: locale })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Optional: reload to apply RSC changes if using server components
      // router.refresh();
    } catch (err) {
      console.error('Failed to change language:', err);
      setError(t('language.error.change', 'Failed to change language. Please try again.'));
      // Revert selection
      setSelectedLocale(currentLocale);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('language.pageTitle', 'Language · Settings · GramorX')}</title>
        </Head>
        <div className="py-6">
          <Container>
            <Skeleton className="h-8 w-48 rounded-ds-xl mb-4" />
            <Card className="p-6 rounded-ds-2xl">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-ds" />
                <Skeleton className="h-12 w-full rounded-ds" />
                <Skeleton className="h-12 w-full rounded-ds" />
              </div>
            </Card>
          </Container>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t('language.pageTitle', 'Language · Settings · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'language.pageDescription',
            'Choose your preferred language for the GramorX interface.'
          )}
        />
      </Head>

      <div className="py-6">
        <Container>
          <header className="mb-4">
            <h1 className="text-h2 font-bold text-foreground">
              {t('language.title', 'Language')}
            </h1>
            <p className="text-small text-muted-foreground">
              {t(
                'language.subtitle',
                'Select your preferred language for the interface. This will affect all text displayed in the app.'
              )}
            </p>
          </header>

          {error && (
            <Alert variant="error" className="mb-4" role="alert">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4" role="status">
              {t('language.success', 'Language updated successfully.')}
            </Alert>
          )}

          <Card className="rounded-ds-2xl p-6">
            <div className="space-y-4">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange(option.value)}
                  disabled={saving || selectedLocale === option.value}
                  className={`
                    w-full flex items-center justify-between p-4 rounded-ds-xl border-2 transition-all
                    ${
                      selectedLocale === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }
                    ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  aria-pressed={selectedLocale === option.value}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl" role="img" aria-label={option.label}>
                      {option.flag}
                    </span>
                    <span className="text-body font-medium">{option.label}</span>
                  </div>
                  {selectedLocale === option.value && (
                    <span className="text-primary text-sm">
                      {t('language.selected', 'Selected')} ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-caption text-muted-foreground">
                {t(
                  'language.note',
                  'Note: Some content like user-generated posts or emails may still appear in the original language.'
                )}
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                {t('common.back', 'Back')}
              </Button>
            </div>
          </Card>
        </Container>
      </div>
    </>
  );
}