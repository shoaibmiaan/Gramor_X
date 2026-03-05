// pages/auth/confirm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { LOGIN, ONBOARDING } from '@/lib/constants/routes';
import { withQuery } from '@/lib/constants/routes';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Preparing verification...');

  useEffect(() => {
    if (!router.isReady) return;

    const verifyEmail = async () => {
      setStatus('loading');
      setMessage('Verifying your email… Please wait.');

      const query = router.query;

      // ────────────────────────────────────────────────
      // Extract parameters (handle both formats)
      // ────────────────────────────────────────────────
      const tokenHash = typeof query.token_hash === 'string' ? query.token_hash : null;
      const code = typeof query.code === 'string' ? query.code : null;
      const typeParam = typeof query.type === 'string' ? query.type : 'signup';
      const next = typeof query.next === 'string' && query.next.startsWith('/') ? query.next : null;

      console.log('[confirm] Query params:', { tokenHash, code, type: typeParam, next });

      if (!tokenHash && !code) {
        setStatus('error');
        setMessage('Invalid or missing verification link. Please request a new confirmation email.');
        setTimeout(() => router.replace(withQuery(LOGIN, { error: 'invalid_link' })), 3500);
        return;
      }

      try {
        let result;

        // Preferred: token_hash method (used in most modern Supabase email confirmations)
        if (tokenHash) {
          console.log('[confirm] Using verifyOtp with token_hash');
          result = await supabaseBrowser().auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam as 'signup' | 'magiclink' | 'recovery' | 'email_change',
          });
        }
        // Fallback: code exchange (older / PKCE style)
        else if (code) {
          console.log('[confirm] Using exchangeCodeForSession');
          result = await supabaseBrowser().auth.exchangeCodeForSession(code);
        }

        if (!result || result.error) {
          throw result?.error || new Error('Verification failed');
        }

        // Force session refresh
        const { data: { session }, error: sessionError } = await supabaseBrowser().auth.getSession();

        if (sessionError || !session) {
          throw new Error('No session created after verification');
        }

        console.log('[confirm] Session created successfully');

        // Optional: notify server-side (your bridge endpoint)
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ event: 'SIGNED_IN', session }),
          });
        } catch (e) {
          console.warn('[confirm] Session bridge failed (non-critical)', e);
        }

        setStatus('success');
        setMessage('Email verified! Logging you in...');

        // Decide where to go
        let destination = ONBOARDING;

        // If there's a next param, prefer it
        if (next) {
          destination = next;
        }

        // Small delay for nice UX
        setTimeout(() => {
          router.replace(destination);
        }, 1400);

      } catch (err: any) {
        console.error('[confirm] Verification error:', err);

        let displayMsg = 'Verification failed. Please try again.';

        if (err.message?.includes('expired')) {
          displayMsg = 'This confirmation link has expired. Please sign up again or request a new link.';
        } else if (err.message?.includes('already confirmed')) {
          displayMsg = 'Email already confirmed. You can sign in directly.';
        } else if (err.message?.includes('invalid')) {
          displayMsg = 'Invalid verification link. Please use the latest email we sent you.';
        }

        setStatus('error');
        setMessage(displayMsg);

        setTimeout(() => {
          router.replace(withQuery(LOGIN, { error: 'verification_failed' }));
        }, 5000);
      }
    };

    verifyEmail();
  }, [router.isReady, router.query, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {status === 'idle' || status === 'loading' ? (
          <>
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="mb-4 text-2xl font-semibold">Verifying your email</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="mx-auto mb-6 text-7xl">✅</div>
            <h2 className="mb-4 text-2xl font-bold text-green-600 dark:text-green-400">
              Email Verified!
            </h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 text-7xl">❌</div>
            <h2 className="mb-4 text-2xl font-bold text-destructive">Verification Failed</h2>
            <p className="mb-6 text-muted-foreground">{message}</p>
            <button
              onClick={() => router.replace(LOGIN)}
              className="rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}