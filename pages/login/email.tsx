'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Session } from '@supabase/supabase-js';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { isValidEmail } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { resolvePostLoginRoute } from '@/lib/auth/postLoginRoute';

async function syncServerSession(session: Session | null) {
  try {
    const syncRes = await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ event: 'SIGNED_IN', session }),
    });

    if (!syncRes.ok) {
      console.error('Sync server session failed:', syncRes.status);
      return false;
    }

    const syncBody = await syncRes.json().catch(() => ({}));
    if (syncBody && typeof syncBody === 'object' && syncBody.ok === false) {
      console.error('Sync server session failed: response not ok');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Sync server session failed:', error);
    return false;
  }
}

async function recordLoginEvent(session: Session | null, allowResync = true) {
  try {
    const loginEventRes = await fetch('/api/auth/login-event', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (loginEventRes.status === 401 && allowResync) {
      const resynced = await syncServerSession(session);
      if (resynced) return recordLoginEvent(session, false);
    }

    if (!loginEventRes.ok) {
      console.error('Login event failed:', loginEventRes.status);
    }
  } catch (error) {
    console.error('Error logging login event:', error);
  }
}

export default function LoginWithEmail() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErr('Email is required.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailErr('Enter a valid email address.');
      return;
    }

    setEmailErr(null);
    setLoading(true);

    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });

      if (error) {
        setErr(getAuthErrorMessage(error) ?? 'Unable to send your sign-in code. Please try again.');
        return;
      }

      setOtpSent(true);
    } catch (submitError) {
      console.error('Login error:', submitError);
      setErr('Unable to send your sign-in code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp) {
      setErr('Verification code is required.');
      return;
    }

    setVerifying(true);

    try {
      const { data, error } = await supabaseBrowser.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'email',
      });

      if (error || !data.session) {
        setErr(getAuthErrorMessage(error) ?? 'Unable to verify your code. Please try again.');
        return;
      }

      const serverSynced = await syncServerSession(data.session);
      if (!serverSynced) {
        await syncServerSession(data.session);
      }

      await recordLoginEvent(data.session);

      const target = await resolvePostLoginRoute();

      try {
        await router.replace(target);
      } catch (routerError) {
        console.error('Redirect after login failed:', routerError);
        if (typeof window !== 'undefined') window.location.assign(target);
      }
    } catch (verifyError) {
      console.error('OTP verification error:', verifyError);
      setErr('Unable to verify your code. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <SectionLabel>Sign in with Email + Code</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      {!otpSent ? (
        <form onSubmit={onSubmit} className="space-y-6 mt-2">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              const v = e.target.value;
              setEmail(v);
              setEmailErr(!v || isValidEmail(v.trim()) ? null : 'Enter a valid email address.');
            }}
            autoComplete="email"
            required
            error={emailErr ?? undefined}
          />
          <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={loading}>
            {loading ? 'Sending code…' : 'Send code'}
          </Button>
          <p className="mt-2 text-caption text-mutedText text-center">
            By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> &amp;{' '}
            <Link href="/legal/privacy" className="underline">Privacy</Link>.
          </p>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-6 mt-2 max-w-xs">
          <Input
            label="Enter code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            autoComplete="one-time-code"
            placeholder="6-digit code"
            required
          />
          <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={verifying}>
            {verifying ? 'Verifying code…' : 'Verify code & Sign in'}
          </Button>
        </form>
      )}

      <Button asChild variant="secondary" className="mt-6 rounded-ds-xl" fullWidth>
        <Link href="/login">Back to Login Options</Link>
      </Button>
    </>
  );
}
