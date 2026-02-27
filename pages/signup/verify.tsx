// pages/signup/verify.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { readStoredPkceVerifier } from '@/lib/auth/pkce';
import { ONBOARDING, SIGNUP, LOGIN } from '@/lib/constants/routes';
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

      setStatus('sent');
      setCooldown(30);
    } catch {
      setErr('Failed to resend the verification email. Please try again.');
      setStatus('error');
    }
  }

  // If the page was opened without an email param, nudge them back
  if (!email) {
    return (
      <div className="space-y-4">
        <SectionLabel>Verify your email</SectionLabel>
        <Alert variant="warning" title="No email found">
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
    <div className="space-y-4">
      <SectionLabel>Verify your email</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      {status === 'sent' && !err && (
        <Alert variant="success" title="Sent" role="status" aria-live="polite">
          Verification email sent. Please check your inbox.
        </Alert>
      )}

      <p className="text-muted-foreground">
        We sent a verification link to <strong>{email}</strong>. Click it to verify and continue setup.
      </p>

      <div className="space-y-4">
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

      <Button asChild variant="secondary" className="rounded-ds-xl" fullWidth>
        <Link href={SIGNUP}>Back to Sign-up Options</Link>
      </Button>
    </div>
  );
}
