import React from 'react';

import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const isValidPhone = (value: string) => {
  const sanitized = value.replace(/[\s-]/g, '');
  return /^\+?[0-9]{10,15}$/.test(sanitized);
};

export function WhatsAppOptIn() {
  const [phone, setPhone] = React.useState('');
  const [status, setStatus] = React.useState<SubmitStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [submittedValue, setSubmittedValue] = React.useState<string | null>(null);

  const canSubmit = phone.trim().length > 0 && isValidPhone(phone);

  const onSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidPhone(phone)) {
        setError('Enter a valid international phone number (e.g. +14155552671).');
        setStatus('error');
        return;
      }

      setStatus('loading');
      setError(null);
      const sanitized = phone.replace(/[\s-]/g, '');
      try {
        const res = await fetch('/api/whatsapp/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: sanitized }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j?.error || 'Request failed');
          setStatus('error');
          return;
        }
        setSubmittedValue(sanitized);
        setStatus('success');
        setPhone('');
      } catch (err: any) {
        setError(err?.message || 'Request failed');
        setStatus('error');
      }
    },
    [phone],
  );

  const resetForm = React.useCallback(() => {
    setStatus('idle');
    setError(null);
    setPhone(submittedValue ?? '');
  }, [submittedValue]);

  return (
    <Card className="rounded-ds-2xl p-6">
      <h2 className="mb-4 font-slab text-h2">WhatsApp updates</h2>
      {status === 'success' ? (
        <div className="space-y-3">
          <p className="text-small text-grayish dark:text-muted-foreground" role="status" aria-live="polite">
            You&apos;re subscribed to WhatsApp reminders{submittedValue ? ` at ${submittedValue}` : ''}.
          </p>
          <Button variant="secondary" className="rounded-ds-xl" onClick={resetForm}>
            Update number
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 sm:flex sm:items-end" noValidate>
          <Input
            label="Phone number"
            type="tel"
            placeholder="+14155552671"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (status === 'error') setStatus('idle');
              if (error) setError(null);
            }}
            className="sm:flex-1"
            error={error || undefined}
            required
          />
          <Button type="submit" variant="primary" className="rounded-ds-xl" disabled={!canSubmit || status === 'loading'}>
            {status === 'loading' ? 'Submitting…' : 'Subscribe'}
          </Button>
        </form>
      )}
      {status === 'error' && error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

export default WhatsAppOptIn;
