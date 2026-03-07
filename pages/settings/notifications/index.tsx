import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Toggle } from '@/components/design-system/Toggle';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Card } from '@/components/design-system/Card';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';
import { track } from '@/lib/analytics/track';

interface ChannelState {
  email: boolean;
  whatsapp: boolean;
}

interface FormState {
  channels: ChannelState;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

interface ContactState {
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
}

interface ServerPreferences {
  channels: Record<'email' | 'whatsapp', boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  email: string | null;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  phone: string | null;
  phoneVerified: boolean;
}

interface PreferencesResponse {
  preferences: ServerPreferences;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

// Helper to format time string for input[type="time"]
function toTimeInput(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return null;
}

// Normalize server preferences to form state
function normalizePayload(preferences: ServerPreferences): { form: FormState; contact: ContactState } {
  return {
    form: {
      channels: {
        email: Boolean(preferences.channels.email),
        whatsapp: Boolean(preferences.channels.whatsapp),
      },
      quietHoursStart: toTimeInput(preferences.quietHoursStart),
      quietHoursEnd: toTimeInput(preferences.quietHoursEnd),
      timezone: preferences.timezone || 'UTC',
    },
    contact: {
      email: preferences.email,
      phone: preferences.phone,
      phoneVerified: Boolean(preferences.phoneVerified),
    },
  };
}

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();

  const [form, setForm] = React.useState<FormState>({
    channels: { email: true, whatsapp: false },
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
  });
  const [contact, setContact] = React.useState<ContactState>({
    email: null,
    phone: null,
    phoneVerified: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<Status>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const autoUnsubApplied = React.useRef(false);

  // Get list of supported timezones (fallback to UTC if Intl.supportedValuesOf not available)
  const timezoneOptions = React.useMemo(() => {
    try {
      const supported = (Intl as any).supportedValuesOf?.('timeZone') as string[] | undefined;
      return supported && supported.length > 0 ? supported : ['UTC'];
    } catch {
      return ['UTC'];
    }
  }, []);

  const applyPreferences = React.useCallback((payload: ServerPreferences) => {
    const { form: mappedForm, contact: mappedContact } = normalizePayload(payload);
    setForm(mappedForm);
    setContact(mappedContact);
    setHasLoaded(true);
  }, []);

  // Load preferences on mount
  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'GET',
          credentials: 'include',
        });

        if (!active) return;

        if (response.status === 401) {
          setError(t('notifications.error.auth', 'Please sign in to manage notification preferences.'));
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(t('notifications.error.load', 'Failed to load preferences.'));
          setLoading(false);
          return;
        }

        const data = (await response.json()) as PreferencesResponse;
        applyPreferences(data.preferences);
      } catch (err) {
        if (!active) return;
        setError(t('notifications.error.load', 'Failed to load preferences.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [applyPreferences, t]);

  // Auto-clear saved status after 2 seconds
  React.useEffect(() => {
    if (status !== 'saved') return;
    const timer = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  // Persist changes to server
  const persist = React.useCallback(
    async (next: FormState) => {
      setStatus('saving');
      setError(null);
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            channels: next.channels,
            quietHoursStart: next.quietHoursStart ?? null,
            quietHoursEnd: next.quietHoursEnd ?? null,
            timezone: next.timezone,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? t('notifications.error.save', 'Failed to save preferences.'));
        }

        const data = (await response.json()) as PreferencesResponse;
        applyPreferences(data.preferences);
        setStatus('saved');
        toastSuccess(t('notifications.success.save', 'Preferences saved successfully.'));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : t('notifications.error.save', 'Failed to save preferences.');
        setError(message);
        setStatus('error');
        toastError(message);
        return false;
      }
    },
    [applyPreferences, toastSuccess, toastError, t]
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await persist(form);
    },
    [form, persist]
  );

  const handleChannelChange = (key: keyof ChannelState, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      channels: { ...prev.channels, [key]: value },
    }));
  };

  const handleTimeChange = (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value && value.trim().length > 0 ? value : null,
    }));
  };

  const handleTimezoneChange = (value: string) => {
    setForm((prev) => ({ ...prev, timezone: value }));
  };

  const handleUnsubscribe = React.useCallback(
    async (source: 'manual' | 'auto') => {
      if (source === 'manual') {
        track('unsubscribe_clicked', { location: 'settings_notifications_footer' });
      }

      if (!hasLoaded) return;

      const next: FormState = {
        ...form,
        channels: { email: false, whatsapp: false },
      };
      setForm(next);
      await persist(next);
    },
    [form, hasLoaded, persist]
  );

  // Handle auto-unsubscribe from URL param
  React.useEffect(() => {
    if (!router.isReady || !hasLoaded || autoUnsubApplied.current) return;
    const flag = router.query.unsubscribe;
    if (flag === '1') {
      autoUnsubApplied.current = true;
      handleUnsubscribe('auto');
      router.replace('/settings/notifications', undefined, { shallow: true }).catch(console.error);
    }
  }, [router, hasLoaded, handleUnsubscribe]);

  const statusMessage = React.useMemo(() => {
    switch (status) {
      case 'saving':
        return t('common.saving', 'Saving…');
      case 'saved':
        return t('common.saved', 'Saved ✓');
      case 'error':
        return t('common.error', 'Error');
      default:
        return null;
    }
  }, [status, t]);

  return (
    <>
      <Head>
        <title>{t('notifications.pageTitle', 'Notifications · Settings · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'notifications.pageDescription',
            'Manage how and when GramorX reaches out to you.'
          )}
        />
      </Head>

      <div className="py-6">
        <Container>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-h2 font-bold text-foreground">
                {t('notifications.title', 'Notification preferences')}
              </h1>
              <p className="text-small text-mutedText">
                {t(
                  'notifications.subtitle',
                  'Choose your channels, set quiet hours, and stay in control of reminders.'
                )}
              </p>
            </div>
          </header>

          {error && (
            <Alert variant="error" appearance="soft" className="mb-4" role="alert">
              {error}
            </Alert>
          )}

          <Card className="rounded-ds-2xl border border-border bg-card p-5 text-card-foreground">
            {loading && (
              <div className="space-y-3" aria-hidden>
                <Skeleton className="h-10 w-56 rounded-ds-xl" />
                <Skeleton className="h-5 w-full rounded-ds" />
                <Skeleton className="h-5 w-full rounded-ds" />
              </div>
            )}

            {!loading && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Toggle
                    label={t('notifications.channel.email', 'Email')}
                    hint={t(
                      'notifications.channel.emailHint',
                      'Get summaries and important account updates in your inbox.'
                    )}
                    checked={form.channels.email}
                    onChange={(value) => handleChannelChange('email', value)}
                  />
                  <Toggle
                    label={t('notifications.channel.whatsapp', 'WhatsApp')}
                    hint={t(
                      'notifications.channel.whatsappHint',
                      'Receive quick nudges and reminders on WhatsApp.'
                    )}
                    checked={form.channels.whatsapp}
                    onChange={(value) => handleChannelChange('whatsapp', value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    type="time"
                    label={t('notifications.quietHours.start', 'Quiet hours start')}
                    value={form.quietHoursStart ?? ''}
                    onChange={(event) => handleTimeChange('quietHoursStart', event.target.value)}
                  />
                  <Input
                    type="time"
                    label={t('notifications.quietHours.end', 'Quiet hours end')}
                    value={form.quietHoursEnd ?? ''}
                    onChange={(event) => handleTimeChange('quietHoursEnd', event.target.value)}
                  />
                  <div className="md:col-span-2">
                    <Select
                      label={t('notifications.timezone', 'Timezone')}
                      value={form.timezone}
                      onChange={(event) => handleTimezoneChange(event.target.value)}
                      options={timezoneOptions.map((tz) => ({ value: tz, label: tz }))}
                    />
                  </div>
                </div>

                <div className="rounded-ds-xl border border-border bg-background p-4">
                  <h2 className="text-body font-semibold text-foreground">
                    {t('notifications.deliverySummary', 'Delivery summary')}
                  </h2>
                  <ul className="mt-2 space-y-2 text-small text-mutedText">
                    <li>
                      <span className="font-medium text-foreground">
                        {t('notifications.email', 'Email')}:
                      </span>{' '}
                      {contact.email ? (
                        contact.email
                      ) : (
                        <span className="italic">
                          {t('notifications.noEmail', 'Add an email in your profile to receive emails.')}
                        </span>
                      )}
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        {t('notifications.whatsapp', 'WhatsApp')}:
                      </span>{' '}
                      {contact.phone ? (
                        <>
                          {contact.phone}
                          {!contact.phoneVerified && (
                            <Badge size="sm" variant="warning" className="ml-2">
                              {t('notifications.verificationPending', 'verification pending')}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="italic">
                          {t('notifications.noPhone', 'Add a WhatsApp number to receive reminders.')}
                        </span>
                      )}
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={status === 'saving'}>
                    {t('notifications.save', 'Save preferences')}
                  </Button>
                  <span className="text-small text-mutedText" role="status" aria-live="polite">
                    {statusMessage}
                  </span>
                </div>
              </form>
            )}
          </Card>

          <footer className="mt-6 flex flex-wrap items-center gap-3 text-small text-mutedText">
            <Link className="text-primary hover:underline" href="/legal/privacy">
              {t('footer.privacy', 'Privacy')}
            </Link>
            <span aria-hidden>·</span>
            <Link className="text-primary hover:underline" href="/legal/terms">
              {t('footer.terms', 'Terms')}
            </Link>
            <span aria-hidden>·</span>
            <Link
              className="text-primary hover:underline"
              href="/settings/notifications?unsubscribe=1"
              onClick={(event) => {
                event.preventDefault();
                handleUnsubscribe('manual');
              }}
            >
              {t('notifications.unsubscribe', 'Unsubscribe')}
            </Link>
          </footer>
        </Container>
      </div>
    </>
  );
}