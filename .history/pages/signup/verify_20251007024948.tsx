// pages/signup/verify.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function VerifyEmailPage() {
  const router = useRouter();
  const email = typeof router.query?.email === 'string' ? router.query.email : '';
  const role  = typeof router.query?.role === 'string'  ? router.query.role  : '';
  const ref   = typeof router.query?.ref === 'string'   ? router.query.ref   : '';

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Build the same "next" you used during sign-up so the magic link returns users correctly
  const next = useMemo(() => {
    const qs = new URLSearchParams();
    if (role) qs.set('role', role);
    if (ref)  qs.set('ref', ref);
    const tail = qs.toString();
    return `/onboarding/goal${tail ? `?${tail}` : ''}`;
  }, [role, ref]);

  // Basic cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function resend() {
    setErr(null);
    if (!email) {
      setErr('Missing email address.');
      return;
    }
    setStatus('sending');
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.example';

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setErr(error.message);
        setStatus('idle');
        return;
      }

      setStatus('sent');
      setCooldown(30); // 30s cooldown before allowing another resend
    } catch (e: any) {
      setErr('Could not resend the email. Please try again.');
      setStatus('idle');
    }
  }

  // Convenience link to Gmail/Outlook in browser (fallback to mailto)
  const gmailUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(email)}`;
  const outlookUrl = `https://outlook.live.com/mail/0/inbox`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <SectionLabel>Verify your email</SectionLabel>

      {!email ? (
        <Alert variant="warning" title="No email found" className="mt-3">
          We couldn’t detect your email address for verification.
          <div className="mt-2">
            <Link className="text-primary underline" href={`/signup${role ? `?role=${encodeURIComponent(role)}` : ''}`}>
              Go back to sign up
            </Link>
          </div>
        </Alert>
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
            Please open your inbox and click the link to verify. The link will bring you back to complete setup.
          </p>

          {err && (
            <Alert variant="warning" title="Error" className="mt-4" role="status" aria-live="assertive">
              {err}
            </Alert>
          )}

          <div className="mt-6 grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                onClick={resend}
                disabled={status === 'sending' || cooldown > 0}
                className="sm:flex-1"
              >
                {status === 'sending' ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
              </Button>

              <Button asChild variant="secondary" className="sm:flex-1">
                <a href={gmailUrl} target="_blank" rel="noreferrer">Open Gmail</a>
              </Button>

              <Button asChild variant="secondary" className="sm:flex-1">
                <a href={outlookUrl} target="_blank" rel="noreferrer">Open Outlook</a>
              </Button>
            </div>

            <Button asChild variant="link">
              <a href={`mailto:${email}`}>Open default mail app</a>
            </Button>
          </div>

          <div className="mt-8 text-caption text-muted-foreground">
            <p className="mb-2">Didn’t get the email?</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Check your spam or promotions folder.</li>
              <li>Make sure <span className="font-mono">no-reply@supabase.io</span> and our domain aren’t blocked.</li>
              <li>Try the resend button above after a short delay.</li>
            </ul>
          </div>

          <div className="mt-8">
            <Button asChild variant="link">
              <Link href={`/signup${role ? `?role=${encodeURIComponent(role)}` : ''}`}>Use a different email</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
