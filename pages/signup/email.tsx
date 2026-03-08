// pages/signup/email.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { isValidEmail } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { ONBOARDING, LOGIN, SIGNUP, TERMS, PRIVACY } from '@/lib/constants/routes';
import { withQuery } from '@/lib/constants/routes';

export default function SignUpWithEmail() {
  const router = useRouter();
  const role = typeof router.query?.role === 'string' ? (router.query.role as string) : '';
  const ref = typeof router.query?.ref === 'string' ? (router.query.ref as string) : '';
  const rawNext = typeof router.query?.next === 'string' ? (router.query.next as string) : '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const nextQS = new URLSearchParams();
    if (role) nextQS.set('role', role);
    if (ref) nextQS.set('ref', ref);
    const fallbackNext = withQuery(ONBOARDING, Object.fromEntries(nextQS));
    const nextPath = next || fallbackNext;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });

      if (error) {
        setErr(getAuthErrorMessage(error) || error.message || 'Unable to send verification code.');
        return;
      }

      const verifyParams = new URLSearchParams({ email: trimmedEmail });
      if (role) verifyParams.set('role', role);
      if (ref) verifyParams.set('ref', ref);
      if (nextPath) verifyParams.set('next', nextPath);
      await router.replace(`/signup/verify?${verifyParams.toString()}`);
    } catch (_e: any) {
      setErr('Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionLabel>Sign Up with Email + Code</SectionLabel>

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

        <Input
          label="Referral Code (Optional)"
          type="text"
          placeholder="Enter referral code (if any)"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />

        <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={loading}>
          {loading ? 'Sending code…' : 'Continue with Email Code'}
        </Button>

        <Button asChild variant="link" className="mt-2" fullWidth>
          {(() => {
            const qp = new URLSearchParams();
            if (role) qp.set('role', role);
            if (next) qp.set('next', next);
            return <Link href={withQuery(LOGIN, Object.fromEntries(qp))}>Already have an account? Log in</Link>;
          })()}
        </Button>

        <p className="mt-2 text-caption text-mutedText text-center">
          By continuing you agree to our <Link href={TERMS} className="underline">Terms</Link> &amp;{' '}
          <Link href={PRIVACY} className="underline">Privacy</Link>.
        </p>
      </form>

      <div className="mt-4 text-center">
        {(() => {
          const qp = new URLSearchParams();
          if (role) qp.set('role', role);
          if (ref) qp.set('ref', ref);
          if (next) qp.set('next', next);
          return (
            <Link href={withQuery(SIGNUP, Object.fromEntries(qp))} className="text-primary underline">
              Back to Sign Up Methods
            </Link>
          );
        })()}
      </div>
    </>
  );
}
