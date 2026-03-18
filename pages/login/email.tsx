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
import useEmailLoginMFA from '@/hooks/useEmailLoginMFA';
import { sanitizeInternalNextPath } from '@/lib/authNextPath';
import { useUserContext } from '@/context/UserContext';
import {
  getCurrentUser,
  getCurrentSession,
  loginWithPassword,
  recordLoginEvent,
  setClientSession,
  syncServerSession,
} from '@/lib/auth';

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
    const safeNext = sanitizeInternalNextPath(router.query.next);
    const fallback = currentUser ? destinationByRole(currentUser as any) : '/dashboard';
    return safeNext && safeNext !== '/login' ? safeNext : fallback;
  }, [router.query.next]);

  const navigateAfterAuth = React.useCallback(async (currentUser: { id?: string } | null) => {
    const target = resolveTarget(currentUser);
    await getCurrentSession();
    setTimeout(() => {
      void router.replace(target);
    }, 50);
  }, [resolveTarget, router]);

  const handleVerifyOtp = React.useCallback((e: React.FormEvent) =>
    verifyOtp(e, async () => {
      const sessionUser = await getCurrentUser();
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

    try {
      const body = await loginWithPassword(trimmedEmail, pw);
      setLoading(false);

      if (!body.session) {
        setErr('Unable to sign in. Please try again.');
        return;
      }

      await setClientSession(body.session).catch((authErr) =>
        console.error('Set session failed:', authErr),
      );

      const serverSynced = await syncServerSession(body.session);
      const user = await getCurrentUser();

      // Skip OTP if both email and password are provided
      if (!body.mfaRequired) {
        if (!serverSynced) {
          await syncServerSession(body.session);
        }

        try {
          await navigateAfterAuth(user);
          void recordLoginEvent(body.session);
        } catch (err) {
          const target = resolveTarget(user);
          console.error('Redirect after login failed:', err);
          if (typeof window !== 'undefined') window.location.assign(target);
          void recordLoginEvent(body.session);
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
