'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Session } from '@supabase/supabase-js';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Input } from '@/components/design-system/Input';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { destinationByRole } from '@/lib/routeAccess';
import { isValidEmail } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';
import useEmailLoginMFA from '@/hooks/useEmailLoginMFA';

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

    // If no email or password is provided, show an error
    if (!trimmedEmail && !pw) {
      setErr('Email and password are required.');
      return;
    }

    // If only email is provided, show error
    if (!trimmedEmail) {
      setErr('Email is required.');
      return;
    }

    if (!pw) {
      setErr('Password is required.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailErr('Enter a valid email address.');
      return;
    }

    setEmailErr(null);

    setLoading(true);
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

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: pw }),
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

      // If login is successful, set session and proceed
      await supabaseBrowser.auth
        .setSession({
          access_token: body.session.access_token,
          refresh_token: body.session.refresh_token,
        })
        .catch(err => console.error('Set session failed:', err));

      const serverSynced = await syncServerSession(body.session);

      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser();
      if (userError) console.error('Get user failed:', userError);

      // Skip OTP if both email and password are provided
      if (!body.mfaRequired) {
        if (!serverSynced) {
          await syncServerSession(body.session);
        }

        await recordLoginEvent(body.session);

        const rawNext = typeof router.query.next === 'string' ? router.query.next : '';
        const safeNext = rawNext && rawNext.startsWith('/') && rawNext !== '/login' ? rawNext : null;

        const fallback = user ? destinationByRole(user) : '/dashboard';
        const target = safeNext ?? fallback;

        try {
          await router.replace(target);
        } catch (err) {
          console.error('Redirect after login failed:', err);
          if (typeof window !== 'undefined') window.location.assign(target);
        }
        return;
      }

      // If MFA (OTP) is required, trigger the challenge
      const challenged = await createChallenge(user).catch(err => console.error('Create challenge failed:', err));
      if (challenged) return;

      // Rely on _app.tsx onAuthStateChange to redirect
    } catch (err) {
      console.error('Login error:', err);
      setErr('Unable to sign in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <SectionLabel>Sign in with Email</SectionLabel>

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
          <Button asChild variant="link" className="mt-2" fullWidth>
            <Link href="/forgot-password">Forgot password?</Link>
          </Button>
          <p className="mt-2 text-caption text-mutedText text-center">
            By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> &amp; <Link href="/legal/privacy" className="underline">Privacy</Link>.
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

      <Button asChild variant="secondary" className="mt-6 rounded-ds-xl" fullWidth>
        <Link href="/login">Back to Login Options</Link>
      </Button>
    </>
  );
}
