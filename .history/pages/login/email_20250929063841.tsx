// pages/login/email.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Input } from '@/components/design-system/Input';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { getAuthErrorMessage } from '@/lib/authErrors';
import useEmailLoginMFA from '@/hooks/useEmailLoginMFA';
import { isValidEmail } from '@/utils/validation';

export default function LoginWithEmail() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    otp,
    setOtp,
    otpSent,
    createChallenge,
    verifyOtp,
    verifying,
    error: mfaErr,
    setError: setMfaErr,
  } = useEmailLoginMFA();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMfaErr(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !pw) {
      setErr('Email and password are required.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailErr('Enter a valid email address.');
      return;
    }
    setEmailErr(null);

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: pw }),
        credentials: 'same-origin',
      });

      const body = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || !body.session) {
        const msg =
          typeof body.error === 'string'
            ? body.error
            : getAuthErrorMessage(body.error) ?? 'Unable to sign in. Please try again.';
        setErr(msg);
        return;
      }

      // Set client session
      await supabaseBrowser.auth
        .setSession({
          access_token: body.session.access_token,
          refresh_token: body.session.refresh_token,
        })
        .catch((err) => {
          console.error('Set session failed:', err);
        });

      // Ensure backend cookies are set by informing set-session endpoint (optional — _app already syncs onAuthStateChange)
      try {
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ event: 'SIGNED_IN', session: body.session }),
        });
      } catch (e) {
        // non-fatal
        console.warn('set-session call failed (non-fatal):', e);
      }

      // If MFA flow is required, run that
      const challenged = await createChallenge(body.session?.user).catch((err) =>
        console.error('Create challenge failed:', err),
      );
      if (challenged) {
        // createChallenge handles UI flow for OTP; exit here to allow OTP verification
        return;
      }

      // Optional: emit a login-event (non-blocking)
      try {
        const loginEventRes = await fetch('/api/auth/login-event', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!loginEventRes.ok) console.warn('Login event failed:', loginEventRes.status);
      } catch (err) {
        console.warn('Error logging login event:', err);
      }

      // Redirect to dashboard/home — rely on routeAccess/role redirect if available
      router.replace('/dashboard');
    } catch (err2) {
      console.error('Login error:', err2);
      setErr('Unable to sign in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      {(err || mfaErr) && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err || mfaErr}
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
          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="mt-2 grid gap-2">
            <Button asChild variant="link" className="mt-2" fullWidth>
              <Link href="/forgot-password">Forgot password?</Link>
            </Button>
          </div>

          <p className="mt-2 text-caption text-mutedText text-center">
            By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> &amp;{' '}
            <Link href="/legal/privacy" className="underline">Privacy</Link>.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-6 mt-2 max-w-xs">
          <Input
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            autoComplete="one-time-code"
            placeholder="6-digit code"
            required
          />
          <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify & Sign in'}
          </Button>
        </form>
      )}
    </>
  );
}
