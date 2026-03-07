// pages/signup/verify.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Input } from '@/components/design-system/Input';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { readStoredPkceVerifier } from '@/lib/auth/pkce';
import { ONBOARDING, SIGNUP } from '@/lib/constants/routes';
import { withQuery } from '@/lib/constants/routes';

export default function VerifyEmailPage() {
  const router = useRouter();

  const email = typeof router.query.email === 'string' ? router.query.email : '';
  const role = typeof router.query.role === 'string' ? router.query.role : '';
  const ref = typeof router.query.ref === 'string' ? router.query.ref : '';
  const rawNext = typeof router.query.next === 'string' ? router.query.next : '';
  const nextParam = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  // Where the user should land after clicking the magic link → ONBOARDING
  const next = useMemo(() => {
    if (nextParam) return nextParam;
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (ref) params.set('ref', ref);
    return withQuery(ONBOARDING, Object.fromEntries(params));
  }, [nextParam, ref, role]);

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const hasAutoSentCode = useRef(false);

  // Auto-redirect if already signed in (e.g., they verified in another tab)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) router.replace(next);
    })();
    return () => { mounted = false; };
  }, [next, router]);

  // Cooldown timer for the resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const codeVerifier =
    typeof router.query.code_verifier === 'string' && router.query.code_verifier.length > 0
      ? router.query.code_verifier
      : readStoredPkceVerifier() || '';


  async function sendVerificationCode() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });
    if (error) throw error;
  }



  useEffect(() => {
    if (!email || hasAutoSentCode.current) return;
    hasAutoSentCode.current = true;
    void sendVerificationCode().catch(() => {
      // no-op: user can still use resend button
    });
  }, [email]);

  async function onResend() {
    setErr(null);
    if (!email) {
      setErr('We could not detect your email address.');
      return;
    }
    if (status === 'sending' || cooldown > 0) return;

    setStatus('sending');
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

      const verificationParams = new URLSearchParams();
      verificationParams.set('next', next);
      verificationParams.set('email', email);
      if (role) verificationParams.set('role', role);
      if (ref) verificationParams.set('ref', ref);
      if (codeVerifier) verificationParams.set('code_verifier', codeVerifier);

      const { error } = await supabase.auth.resend({
        // @ts-expect-error supabase-js may not expose resend type yet
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${origin}/api/auth/pkce-redirect?${verificationParams.toString()}`,
        },
      });

      if (error) {
        setErr(error.message);
        setStatus('error');
        return;
      }

      await sendVerificationCode();
      setStatus('sent');
      setCooldown(30);
    } catch {
      setErr('Failed to resend the verification email. Please try again.');
      setStatus('error');
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmedCode = code.trim();
    if (!email) {
      setErr('We could not detect your email address.');
      return;
    }
    if (!trimmedCode) {
      setErr('Enter the verification code from your email.');
      return;
    }

    setCodeStatus('verifying');
    let verificationError: Error | null = null;

    const signupAttempt = await supabase.auth.verifyOtp({
      email,
      token: trimmedCode,
      type: 'signup',
    });

    if (signupAttempt.error) {
      const emailAttempt = await supabase.auth.verifyOtp({
        email,
        token: trimmedCode,
        type: 'email',
      });
      verificationError = emailAttempt.error;
    }

    if (signupAttempt.error && verificationError) {
      setCodeStatus('error');
      setErr(verificationError.message || signupAttempt.error.message || 'Invalid verification code.');
      return;
    }

    setCodeStatus('verified');
    await router.replace(next);
  }

  // If the page was opened without an email param, nudge them back
  if (!email) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <SectionLabel>Verify your email</SectionLabel>
        <Alert variant="warning" title="No email found" className="mt-4">
          We couldn’t detect your email address for verification.&nbsp;
          <Link className="text-primary underline" href={SIGNUP}>
            Go back to sign up
          </Link>
          .
        </Alert>
      </div>
    );
  }

  const gmailUrl = 'https://mail.google.com/mail/u/0/#inbox';
  const outlookUrl = 'https://outlook.live.com/mail/0/inbox';
  const mailto = `mailto:${encodeURIComponent(email)}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <SectionLabel>Verify your email</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" className="mt-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      {status === 'sent' && !err && (
        <Alert variant="success" title="Sent" className="mt-4" role="status" aria-live="polite">
          Verification email sent. We also sent a verification code to your inbox.
        </Alert>
      )}

      {codeStatus === 'verified' && !err && (
        <Alert variant="success" title="Verified" className="mt-4" role="status" aria-live="polite">
          Email verified successfully. Redirecting...
        </Alert>
      )}

      <p className="mt-6 text-muted-foreground">
        We sent a verification link to <strong>{email}</strong>. You can either click the link in your
        email or enter the verification code below. If the code is missing, tap resend to get a fresh code.
      </p>

      <form onSubmit={onVerifyCode} className="mt-6 rounded-xl border border-border p-4 space-y-3">
        <Input
          label="Verification Code"
          type="text"
          placeholder="Enter the code from your email"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          required
        />
        <Button
          type="submit"
          className="w-full"
          disabled={codeStatus === 'verifying'}
        >
          {codeStatus === 'verifying' ? 'Verifying code…' : 'Verify code'}
        </Button>
      </form>

      <div className="mt-6 space-y-4">
        <Button onClick={onResend} className="w-full" disabled={status === 'sending' || cooldown > 0}>
          {status === 'sending'
            ? 'Sending…'
            : cooldown > 0
              ? `Resend (${cooldown}s)`
              : 'Resend verification email'}
        </Button>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span>Quick links:</span>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <a href={gmailUrl} target="_blank" rel="noreferrer">
                Open Gmail
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href={outlookUrl} target="_blank" rel="noreferrer">
                Open Outlook
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={mailto}>Write to support</a>
            </Button>
          </div>
        </div>
      </div>

      <Button asChild variant="secondary" className="mt-6 rounded-ds-xl" fullWidth>
        <Link href={SIGNUP}>Back to Sign-up Options</Link>
      </Button>
    </div>
  );
}
