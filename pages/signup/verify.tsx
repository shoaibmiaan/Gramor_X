// pages/signup/verify.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useCountdown } from '@/hooks/useCountdown';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Input } from '@/components/design-system/Input';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { SIGNUP } from '@/lib/constants/routes';
import { resolvePostLoginRoute } from '@/lib/auth/postLoginRoute';

function mapOtpError(message?: string) {
  const normalized = (message || '').toLowerCase();
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return 'Invalid or expired code. Please request a new code and try again.';
  }
  return 'Unable to verify code. Please try again.';
}

export default function VerifyEmailPage() {
  const router = useRouter();

  const email = typeof router.query.email === 'string' ? router.query.email : '';
  const role = typeof router.query.role === 'string' ? router.query.role : '';
  const ref = typeof router.query.ref === 'string' ? router.query.ref : '';
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const hasAutoSentCode = useRef(false);
  const resendInFlightRef = useRef(false);
  const { seconds: resendSeconds, running: resendRunning, start: startResendCooldown } = useCountdown(60);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        const target = await resolvePostLoginRoute();
        router.replace(target);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function sendVerificationCode() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
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
    if (resendInFlightRef.current || status === 'sending' || resendRunning || resendSeconds > 0) return;

    resendInFlightRef.current = true;
    setStatus('sending');
    try {
      await sendVerificationCode();
      setStatus('sent');
      startResendCooldown();
    } catch (error: any) {
      setErr(mapOtpError(error?.message));
      setStatus('error');
    } finally {
      resendInFlightRef.current = false;
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

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: trimmedCode,
      type: 'email',
    });

    if (error) {
      setCodeStatus('error');
      setErr(mapOtpError(error.message));
      return;
    }

    setCodeStatus('verified');
    const target = await resolvePostLoginRoute();
    await router.replace(target);
  }

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
      <SectionLabel>Verify your email code</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" className="mt-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      {status === 'sent' && !err && (
        <Alert variant="success" title="Sent" className="mt-4" role="status" aria-live="polite">
          A fresh verification code has been sent to your inbox.
        </Alert>
      )}

      {codeStatus === 'verified' && !err && (
        <Alert variant="success" title="Verified" className="mt-4" role="status" aria-live="polite">
          Code verified successfully. Redirecting...
        </Alert>
      )}

      <p className="mt-6 text-muted-foreground">
        Enter the verification code sent to <strong>{email}</strong>. If your code expires, resend to get a new one.
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
        <Button type="submit" className="w-full" disabled={codeStatus === 'verifying'}>
          {codeStatus === 'verifying' ? 'Verifying code…' : 'Verify code'}
        </Button>
      </form>

      <div className="mt-6 space-y-4">
        <Button
          onClick={onResend}
          className="w-full"
          disabled={status === 'sending' || resendInFlightRef.current || resendRunning || resendSeconds > 0}
        >
          {status === 'sending' ? 'Sending…' : resendSeconds > 0 ? `Resend OTP (${resendSeconds}s)` : 'Resend OTP'}
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
