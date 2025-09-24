'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

import { SectionLabel } from '@/components/design-system/SectionLabel';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';

export default function ChangePassword() {
  const router = useRouter();
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const match = pw && pw2 && pw === pw2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!match) {
      setErr('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setOk(true);
    } catch (e: any) {
      setErr(e?.message || 'Unable to update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionLabel>Change Password</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}
      {ok && (
        <Alert variant="success" title="Updated" className="mb-4" role="status" aria-live="polite">
          Your password has been updated.
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordInput
          label="New password"
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm new password"
          placeholder="••••••••"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Button type="submit" variant="primary" className="w-full rounded-ds-xl" disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </Button>
      </form>

      <div className="mt-6 grid gap-2">
        <Button asChild variant="secondary" className="rounded-ds-xl" fullWidth>
          <Link href="/login">Back to Login Options</Link>
        </Button>
        <Button asChild variant="link" fullWidth>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </>
  );
}
