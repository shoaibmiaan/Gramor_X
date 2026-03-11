'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Input } from '@/components/design-system/Input';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { destinationByRole } from '@/lib/routeAccess';
import { isValidEmail } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';
import useEmailLoginMFA from '@/hooks/useEmailLoginMFA';
import { useUserContext } from '@/context/UserContext';
import { isApiError } from '@/lib/api';
import { getSession, getUser, loginEmail, recordLoginEvent, resolveAuthRedirect } from '@/lib/auth';

export default function LoginWithEmail() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserContext();
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

  React.useEffect(() => {
    if (!userLoading && user) {
      void router.replace('/dashboard');
    }
  }, [user, userLoading, router]);


  const resolveTarget = React.useCallback((currentUser: { id?: string } | null) => {
    const rawNext = typeof router.query.next === 'string' ? router.query.next : '';
    const safeNext = rawNext && rawNext.startsWith('/') && rawNext !== '/login' ? rawNext : null;
    const fallback = currentUser ? destinationByRole(currentUser as any) : '/dashboard';
    return resolveAuthRedirect(safeNext, fallback);
  }, [router.query.next]);

  const navigateAfterAuth = React.useCallback(async (currentUser: { id?: string } | null) => {
    const target = resolveTarget(currentUser);
    await getSession();
    setTimeout(() => {
      void router.replace(target);
    }, 50);
  }, [resolveTarget, router]);

  const handleVerifyOtp = React.useCallback((e: React.FormEvent) =>
    verifyOtp(e, async () => {
      const { user: sessionUser } = await getUser();
      await navigateAfterAuth(sessionUser);
    }),
  [navigateAfterAuth, verifyOtp]);

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
    async function syncServerSession() {
      try {
        const { session } = await getSession();
        return !!session;
      } catch (error) {
        console.error('Sync server session failed:', error);
        return false;
      }
    }

    async function triggerLoginEvent(allowResync = true) {
      try {
        await recordLoginEvent();
      } catch (error) {
        if (isApiError(error) && error.status === 401 && allowResync) {
          const resynced = await syncServerSession();
          if (resynced) return triggerLoginEvent(false);
        }
        console.error('Error logging login event:', error);
      }
    }

    try {
      const result = await loginEmail({ email: trimmedEmail, password: pw });
      const body = { session: result.data?.session, mfaRequired: result.data?.mfaRequired, error: result.error };
      setLoading(false);

      if (!body.session) {
        const msg =
          typeof body.error === 'string'
            ? body.error
            : getAuthErrorMessage(body.error) ?? 'Unable to sign in. Please try again.';
        setErr(msg);
        return;
      }

      const serverSynced = await syncServerSession();

      const { user, error: userError } = await getUser();
      if (userError) console.error('Get user failed:', userError);

      // Skip OTP if both email and password are provided
      if (!body.mfaRequired) {
        if (!serverSynced) {
          await syncServerSession();
        }

        try {
          await navigateAfterAuth(user);
          void triggerLoginEvent();
        } catch (err) {
          const target = resolveTarget(user);
          console.error('Redirect after login failed:', err);
          if (typeof window !== 'undefined') window.location.assign(target);
          void triggerLoginEvent();
        }
        return;
      }

      // If MFA (OTP) is required, trigger the challenge
      const challenged = await createChallenge(user, async () => {
        await navigateAfterAuth(user);
      }).catch(err => console.error('Create challenge failed:', err));
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
        <form onSubmit={handleVerifyOtp} className="space-y-6 mt-2 max-w-xs">
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
