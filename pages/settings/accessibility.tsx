// pages/settings/accessibility.tsx
import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Toggle } from '@/components/design-system/Toggle';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';
import { useAccessibility } from '@/hooks/useAccessibility';

export default function AccessibilitySettingsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();

  const {
    highContrast,
    reduceMotion,
    fontSize,
    setHighContrast,
    setReduceMotion,
    setFontSize,
    loading,
    error: accessError,
    saveSettings,
  } = useAccessibility();

  const [saving, setSaving] = React.useState(false);
  const [localHighContrast, setLocalHighContrast] = React.useState(highContrast);
  const [localReduceMotion, setLocalReduceMotion] = React.useState(reduceMotion);
  const [localFontSize, setLocalFontSize] = React.useState(fontSize);

  // Sync with hook values when they change
  React.useEffect(() => {
    setLocalHighContrast(highContrast);
    setLocalReduceMotion(reduceMotion);
    setLocalFontSize(fontSize);
  }, [highContrast, reduceMotion, fontSize]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        highContrast: localHighContrast,
        reduceMotion: localReduceMotion,
        fontSize: localFontSize,
      });
      toastSuccess(t('accessibility.success', 'Accessibility settings saved.'));
    } catch (err) {
      toastError(t('accessibility.error', 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    localHighContrast !== highContrast ||
    localReduceMotion !== reduceMotion ||
    localFontSize !== fontSize;

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('accessibility.pageTitle', 'Accessibility · Settings · GramorX')}</title>
        </Head>
        <div className="py-6">
          <Container>
            <Skeleton className="h-8 w-64 rounded-ds-xl mb-4" />
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
        <title>{t('accessibility.pageTitle', 'Accessibility · Settings · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'accessibility.pageDescription',
            'Customize your accessibility preferences for a better experience.'
          )}
        />
      </Head>

      <div className="py-6">
        <Container>
          <header className="mb-4">
            <h1 className="text-h2 font-bold text-foreground">
              {t('accessibility.title', 'Accessibility')}
            </h1>
            <p className="text-small text-muted-foreground">
              {t(
                'accessibility.subtitle',
                'Adjust these settings to make GramorX easier to use based on your needs.'
              )}
            </p>
          </header>

          {accessError && (
            <Alert variant="error" className="mb-4" role="alert">
              {accessError}
            </Alert>
          )}

          <Card className="rounded-ds-2xl p-6">
            <div className="space-y-6">
              <Toggle
                label={t('accessibility.highContrast', 'High contrast mode')}
                hint={t(
                  'accessibility.highContrastHint',
                  'Increase contrast for better readability.'
                )}
                checked={localHighContrast}
                onChange={setLocalHighContrast}
              />

              <Toggle
                label={t('accessibility.reduceMotion', 'Reduce motion')}
                hint={t(
                  'accessibility.reduceMotionHint',
                  'Minimize animations and motion effects.'
                )}
                checked={localReduceMotion}
                onChange={setLocalReduceMotion}
              />

              <div className="space-y-2">
                <label className="text-small font-medium text-foreground">
                  {t('accessibility.fontSize', 'Font size')}
                </label>
                <div className="flex gap-2">
                  {['small', 'medium', 'large'].map((size) => (
                    <Button
                      key={size}
                      variant={localFontSize === size ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLocalFontSize(size as any)}
                    >
                      {t(`accessibility.fontSize.${size}`, size)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => router.back()}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  loading={saving}
                >
                  {saving ? t('common.saving', 'Saving…') : t('common.save', 'Save changes')}
                </Button>
              </div>
            </div>
          </Card>
        </Container>
      </div>
    </>
  );
}