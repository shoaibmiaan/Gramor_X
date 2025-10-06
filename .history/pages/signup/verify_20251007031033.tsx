// pages/signup/verify.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function VerifyEmailPage() {
  const router = useRouter();

  const email = typeof router.query.email === 'string' ? router.query.email : '';
  const role = typeof router.query.role === 'string' ? router.query.role : '';
  const ref  = typeof router.query.ref  === 'string' ? router.query.ref  : '';

  // Where the user should land after clicking the magic link
  const next = useMemo(() => {
    const qs = new URLSearchParams();
    if (role) qs.set('role', role);
    if (ref)  qs.set('ref', ref);
    const path = '/onboarding/goal';
    const s = qs.toString();
    return s ? `${path}?${s}` : path;
  }, [role, ref]);

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

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
      <div className="mx-auto max-w-3xl px-6 py-12">
        <SectionLabel>Verify your email</SectionLabel>
        <Alert variant="warning" title="No email found" className="mt-4">
          We couldn’t detect your email address for verification.&nbsp;
          <Link className="text-primary underline" href="/signup">
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
          Verification email sent. Please check your inbox.
        </Alert>
      )}

      <p className="mt-6 text-muted-foreground">
        We sent a verification link to <strong>{email}</strong>. Please open your inbox and click the link
        to verify. The link will bring you back to complete setup.
      </p>

      <div className="mt-6 space-y-4">
        <Button onClick={onResend} className="w-full" disabled={status === 'sending' || cooldown > 0}>
          {status === 'sending'
            ? 'Sending…'
            : cooldown > 0
              ? `Resend (${cooldown}s)`
              : 'Resend verification email'}
        </Button>

        <div className="grid grid-cols-2 gap-4">
          <Button asChild variant="secondary" className="w-full">
            <a href={gmailUrl} target="_blank" rel="noreferrer">
              Open Gmail
            </a>
          </Button>

          <Button asChild variant="secondary" className="w-full">
            <a href={outlookUrl} target="_blank" rel="noreferrer">
              Open Outlook
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <a className="underline" href={mailto}>
          Open default mail app
        </a>
      </div>

      <div className="mt-8 space-y-2 text-sm text-muted-foreground">
        <p className="font-medium">Didn’t get the email?</p>
        <ul className="list-disc pl-5">
          <li>Check your spam or promotions folder.</li>
          <li>Make sure <code>no-reply@supabase.io</code> and our domain aren’t blocked.</li>
          <li>Try the resend button above after a short delay.</li>
        </ul>
      </div>

      <div className="mt-4 text-center">
        <Link
          href={`/signup/email${role ? `?role=${encodeURIComponent(role)}` : ''}`}
          className="text-primary underline"
        >
          Use a different email
        </Link>
      </div>
    </div>
  );
}