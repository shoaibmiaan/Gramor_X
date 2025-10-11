'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Toggle } from '@/components/design-system/Toggle';
import { useToast } from '@/components/design-system/Toaster';
import {
  NotificationPreferencesSchema,
  type NotificationPreferences,
  type UpdateNotificationPreferences,
} from '@/lib/schemas/notifications';

function isE164(value: string) {
  return /^\+[1-9]\d{1,14}$/.test(value);
}

type OtpStage = 'idle' | 'sending' | 'code' | 'verifying' | 'verified';

export function NotificationPreferencesPanel() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStage, setOtpStage] = useState<OtpStage>('idle');
  const [otpError, setOtpError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications/preferences');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? 'Failed to load preferences');
      }
      const parsed = NotificationPreferencesSchema.parse(json.preferences);
      setPrefs(parsed);
      if (parsed.phone) {
        setPhoneInput(parsed.phone);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preferences';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(
    async (payload: Partial<UpdateNotificationPreferences>) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? 'Failed to update preferences');
      }
      const parsed = NotificationPreferencesSchema.parse(json.preferences);
      setPrefs(parsed);
      return parsed;
    },
    [],
  );

  const handleEmailToggle = useCallback(
    async (checked: boolean) => {
      setEmailSaving(true);
      try {
        const next = await updatePreferences({ emailOptIn: checked });
        toast.success(checked ? 'Email updates enabled' : 'Email updates disabled');
        setPrefs(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not update email preference';
        toast.error(message);
      } finally {
        setEmailSaving(false);
      }
    },
    [toast, updatePreferences],
  );

  const handleWhatsAppToggle = useCallback(
    async (checked: boolean) => {
      if (!prefs) return;
      if (checked && !prefs.phoneVerified) {
        setOtpError('Verify your WhatsApp number to enable task reminders.');
        return;
      }
      setWhatsappSaving(true);
      try {
        const next = await updatePreferences({ whatsappOptIn: checked });
        toast.success(checked ? 'WhatsApp tasks enabled' : 'WhatsApp tasks disabled');
        setPrefs(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not update WhatsApp preference';
        toast.error(message);
      } finally {
        setWhatsappSaving(false);
      }
    },
    [prefs, toast, updatePreferences],
  );

  const requestOtp = useCallback(async () => {
    if (!phoneInput) {
      setOtpError('Enter a WhatsApp number in E.164 format.');
      return;
    }
    if (!isE164(phoneInput)) {
      setOtpError('Use the E.164 format (+923001234567).');
      return;
    }

    setOtpError(null);
    setOtpStage('sending');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, channel: 'whatsapp' }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? 'Unable to send code');
      }
      setOtpStage('code');
      toast.success('We sent a verification code to your WhatsApp.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send code';
      setOtpStage('idle');
      setOtpError(message);
    }
  }, [phoneInput, toast]);

  const verifyOtp = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isE164(phoneInput)) {
        setOtpError('Use the E.164 format (+923001234567).');
        return;
      }
      if (!otpCode) {
        setOtpError('Enter the verification code.');
        return;
      }

      setOtpStage('verifying');
      setOtpError(null);
      try {
        const res = await fetch('/api/check-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneInput, code: otpCode }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? 'Invalid verification code');
        }

        const next = await updatePreferences({
          phone: phoneInput,
          phoneVerified: true,
          whatsappOptIn: true,
          sendTest: true,
        });
        setPrefs(next);
        setOtpStage('verified');
        setOtpCode('');
        toast.success('WhatsApp verified. Look for a test task shortly!');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification failed';
        setOtpStage('code');
        setOtpError(message);
      }
    },
    [otpCode, phoneInput, toast, updatePreferences],
  );

  useEffect(() => {
    if (prefs?.phone && phoneInput === '' && otpStage === 'idle') {
      setPhoneInput(prefs.phone);
    }
  }, [otpStage, phoneInput, prefs?.phone]);

  const whatsappDisabled = useMemo(() => loading || whatsappSaving, [loading, whatsappSaving]);

  return (
    <div className="rounded-ds-xl border border-border/60 bg-surface p-5 shadow-xs">
      <div className="space-y-1">
        <h2 className="font-slab text-h4">Preferences</h2>
        <p className="text-small text-mutedText">Choose how GramorX reaches you with reminders and updates.</p>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="h-6 w-40 animate-pulse rounded-md bg-muted/60" aria-hidden />
          <div className="h-32 animate-pulse rounded-ds-xl bg-muted/40" aria-hidden />
        </div>
      ) : prefs ? (
        <div className="mt-6 space-y-6">
          <Toggle
            checked={prefs.emailOptIn}
            onChange={(checked) => void handleEmailToggle(checked)}
            label="Email updates"
            hint={prefs.email ? `We’ll use ${prefs.email}` : 'Add an email in your profile to receive updates.'}
            disabled={emailSaving}
          />

          <div className="rounded-ds-xl border border-border/60 bg-background/60 p-4 dark:bg-dark/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">WhatsApp task nudges</p>
                <p className="text-small text-mutedText">
                  Verify your WhatsApp number to get daily study tasks and reminders.
                </p>
              </div>
              <Toggle
                checked={prefs.whatsappOptIn && prefs.phoneVerified}
                onChange={(checked) => void handleWhatsAppToggle(checked)}
                disabled={whatsappDisabled || !prefs.phoneVerified}
              />
            </div>

            <div className="mt-4 space-y-4">
              <Input
                label="WhatsApp number"
                placeholder="+923001234567"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                disabled={otpStage === 'sending' || otpStage === 'verifying'}
                error={otpError ?? undefined}
              />

              {otpStage !== 'verified' && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="primary"
                    className="rounded-ds-xl"
                    onClick={() => void requestOtp()}
                    disabled={otpStage === 'sending' || otpStage === 'verifying'}
                  >
                    {otpStage === 'sending' ? 'Sending…' : 'Send verification code'}
                  </Button>
                  {prefs.phoneVerified ? (
                    <span className="text-small text-success">Number verified</span>
                  ) : (
                    <span className="text-small text-mutedText">
                      We’ll send a 6-digit code via WhatsApp. Standard messaging rates apply.
                    </span>
                  )}
                </div>
              )}

              {(otpStage === 'code' || otpStage === 'verifying') && (
                <form onSubmit={verifyOtp} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Input
                    label="Verification code"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    disabled={otpStage === 'verifying'}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-ds-xl"
                    disabled={otpStage === 'verifying'}
                  >
                    {otpStage === 'verifying' ? 'Verifying…' : 'Verify & enable'}
                  </Button>
                </form>
              )}

              {otpStage === 'verified' && (
                <p className="text-small text-success">WhatsApp verified. Tasks are now enabled.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-small text-mutedText">We couldn’t load your preferences right now.</p>
      )}
    </div>
  );
}

export default NotificationPreferencesPanel;
