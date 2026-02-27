'use client';

import { useState } from 'react';
import { Alert } from '@/components/design-system/Alert';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser
import { redirectByRole } from '@/lib/routeAccess';

export default function MfaPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!/^\d{6}$/.test(code)) {
        throw new Error('Please enter a valid 6-digit code.');
      }
      const { data, error } = await supabase.auth.verifyOtp({ type: 'totp', token: code });
      if (error) throw error;
      redirectByRole(data.user ?? null);
    } catch (err: any) {
      console.error('MFA verification error:', err);
      setError(err.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionLabel>Two-factor authentication</SectionLabel>
      <form onSubmit={submit} className="mt-2 max-w-sm space-y-4">
        <Input
          label="Verification code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
          placeholder="123456"
          inputMode="numeric"
          pattern="[0-9]{6}"
          required
        />
        <Button type="submit" disabled={loading} fullWidth className="rounded-ds-xl">
          {loading ? 'Verifying…' : 'Verify'}
        </Button>
      </form>
      {error && (
        <Alert variant="warning" title="Verification error" className="mt-4">
          {error}
        </Alert>
      )}
    </>
  );
}
