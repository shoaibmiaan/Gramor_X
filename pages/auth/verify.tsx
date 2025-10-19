'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-small uppercase tracking-wide text-mutedText">{children}</div>
  );
}

export default function VerifyPage() {
  const { query, replace, isReady, asPath } = useRouter();
  const email = typeof query.email === 'string' ? query.email : null;
  const ref = typeof query.ref === 'string' ? query.ref : '';
  const role = typeof query.role === 'string' ? query.role : '';
  const nextParam = typeof query.next === 'string' ? query.next : '';

  const welcomeHref = React.useMemo(() => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (ref) params.set('ref', ref);
    const search = params.toString();
    return `/welcome${search ? `?${search}` : ''}`;
  }, [ref, role]);

  const redirectHref = React.useMemo(() => {
    if (nextParam && nextParam.startsWith('/')) {
      return nextParam;
    }
    return welcomeHref;
  }, [nextParam, welcomeHref]);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [resent, setResent] = React.useState(false);

  const hasCode = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('code') || params.has('access_token');
  }, [asPath]);

  React.useEffect(() => {
    if (!isReady || !hasCode) return;
    let cancelled = false;

    const handleVerification = async () => {
      setBusy(true);
      setError(null);

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;

        let bridgeOk = false;
        try {
          const response = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ event: 'SIGNED_IN', session: data.session ?? null }),
          });

          if (!response.ok) {
            throw new Error('Unable to finalize sign-in on the server.');
          }

          const payload: { ok?: boolean; error?: string } | null = await response
            .json()
            .catch(() => null);

          bridgeOk = payload?.ok !== false;
          if (!bridgeOk && payload?.error) {
            throw new Error('Unable to finalize sign-in. Please try again.');
          }
        } catch (postErr) {
          console.error('Failed to bridge session after verification:', postErr);
          if (!cancelled) {
            setError(
              postErr instanceof Error
                ? postErr.message
                : 'Unable to finalize sign-in. Please try again.'
            );
          }
          return;
        }

        if (!bridgeOk) {
          if (!cancelled) {
            setError('We verified your email but could not complete sign-in. Try again.');
          }
          return;
        }

        if (!cancelled) {
          void replace(redirectHref);
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        if (!cancelled) {
          setError(err?.message || 'Failed to verify email.');
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    };

    void handleVerification();

    return () => {
      cancelled = true;
    };
  }, [hasCode, isReady, replace, redirectHref]);

  async function handleResend() {
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const params = new URLSearchParams();
      params.set('next', redirectHref);
      if (role) params.set('role', role);
      if (ref) params.set('ref', ref);

      // @ts-expect-error supabase-js may not expose resend type yet
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${origin}/auth/verify?${params.toString()}`,
        },
      });
      if (resendErr) throw resendErr;
      setResent(true);
      setNotice('We’ve sent a new verification link.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionLabel>Verify your email</SectionLabel>
      <Card className="p-6 rounded-ds-2xl card-surface space-y-4">
        {error && (
          <Alert tone="danger">
            {error.toLowerCase().includes('already registered')
              ? 'This email is already registered. You can log in instead.'
              : error}
          </Alert>
        )}
        {notice && <Alert tone="success">{notice}</Alert>}

        {!hasCode && !error && (
          <div>
            <p className="text-small text-mutedText mb-3">
              {email
                ? `We’ve sent a confirmation link to ${email}.`
                : 'Check your inbox for a verification link.'}
            </p>
            <div className="flex gap-3 items-center">
              <Button
                size="sm"
                variant="soft"
                onClick={handleResend}
                disabled={!email || busy || resent}
              >
                {resent ? 'Sent ✓' : busy ? 'Sending…' : 'Resend email'}
              </Button>
              <Link
                href={`/login${ref ? `?ref=${ref}` : ''}`}
                className="text-small text-accent underline"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {hasCode && !error && (
          <p className="text-small text-mutedText">Completing sign-in…</p>
        )}
      </Card>
    </>
  );
}