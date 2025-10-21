'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Input } from '@/components/design-system/Input';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { isValidEmail } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function SignUpWithEmail() {
  const router = useRouter();
  const role = typeof router.query?.role === 'string' ? (router.query.role as string) : '';
  const ref  = typeof router.query?.ref === 'string'  ? (router.query.ref as string)  : '';
  const rawNext = typeof router.query?.next === 'string' ? (router.query.next as string) : '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      setErr('Email and passwords are required.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailErr('Enter a valid email address.');
      return;
    }
    setEmailErr(null);

    if (password !== confirmPassword) {
      setPasswordErr('Passwords do not match.');
      return;
    }
    setPasswordErr(null);

    setLoading(true);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

      // Where to land AFTER clicking the email verification link
      const nextQS = new URLSearchParams();
      if (role) nextQS.set('role', role);
      if (ref) nextQS.set('ref', ref);
      const fallbackNext = `/welcome${nextQS.toString() ? `?${nextQS.toString()}` : ''}`;
      const nextPath = next || fallbackNext;

      const verificationParams = new URLSearchParams();
      verificationParams.set('next', nextPath);
      if (role) verificationParams.set('role', role);
      if (ref) verificationParams.set('ref', ref);

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/verify?${verificationParams.toString()}`,
          // persist intended role on the auth user for downstream use:
          data: { role: role || 'student' },
        },
      });

      if (error) {
        // Common case: already registered but unverified
        if (error.message.toLowerCase().includes('already')) {
          await supabase.auth.resend({
            type: 'signup',
            email: trimmedEmail,
            options: {
              emailRedirectTo: `${origin}/auth/verify?${verificationParams.toString()}`,
            },
          });
          const verifyParams = new URLSearchParams({ email: trimmedEmail });
          if (role) verifyParams.set('role', role);
          if (ref) verifyParams.set('ref', ref);
          if (nextPath) verifyParams.set('next', nextPath);
          await router.replace(`/signup/verify?${verifyParams.toString()}`);
          return;
        }
        setErr(getAuthErrorMessage(error) || error.message);
        setLoading(false);
        return;
      }

      // (Optional) hold referralCode; link it after verification to avoid orphan rows.

      // Success: move user away from the form
      const verifyParams = new URLSearchParams({ email: trimmedEmail });
      if (role) verifyParams.set('role', role);
      if (ref) verifyParams.set('ref', ref);
      if (nextPath) verifyParams.set('next', nextPath);
      await router.replace(`/signup/verify?${verifyParams.toString()}`);
    } catch (_e: any) {
      setErr('Unable to sign up. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <SectionLabel>Sign Up with Email</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6 mt-2">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          error={emailErr ?? undefined}
        />

        <PasswordInput
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          error={passwordErr ?? undefined}
        />

        <Input
          label="Referral Code (Optional)"
          type="text"
          placeholder="Enter referral code (if any)"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          className="rounded-ds-xl"
          fullWidth
          disabled={loading}
        >
          {loading ? 'Signing Up…' : 'Sign Up'}
        </Button>

        <Button asChild variant="link" className="mt-2" fullWidth>
          {(() => {
            const qp = new URLSearchParams();
            if (role) qp.set('role', role);
            if (next) qp.set('next', next);
            const suffix = qp.toString();
            return (
              <Link href={`/login${suffix ? `?${suffix}` : ''}`}>Already have an account? Log in</Link>
            );
          })()}
        </Button>

        <p className="mt-2 text-caption text-mutedText text-center">
          By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> &amp;{' '}
          <Link href="/legal/privacy" className="underline">Privacy</Link>.
        </p>
      </form>

      <div className="mt-4 text-center">
        {(() => {
          const qp = new URLSearchParams();
          if (role) qp.set('role', role);
          if (ref) qp.set('ref', ref);
          if (next) qp.set('next', next);
          const suffix = qp.toString();
          return (
            <Link href={`/signup${suffix ? `?${suffix}` : ''}`} className="text-primary underline">
              Back to Sign Up Methods
            </Link>
          );
        })()}
      </div>
    </>
  );
}
