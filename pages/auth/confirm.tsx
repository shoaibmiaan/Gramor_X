// pages/auth/confirm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { LOGIN, ONBOARDING } from '@/lib/constants/routes';
import { withQuery } from '@/lib/constants/routes';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email… Please wait.');

  useEffect(() => {
    if (!router.isReady) return;

    const handleVerification = async () => {
      const { token_hash, type, next } = router.query;

      // Support both ?token_hash=...&type=signup and legacy ?code=... patterns
      const tokenHash = typeof token_hash === 'string' ? token_hash : null;
      const otpType = typeof type === 'string' ? type : 'signup';

      // Also try to detect code= parameter (some older Supabase links still use it)
      const code = typeof router.query.code === 'string' ? router.query.code : null;

      if (!tokenHash && !code) {
        setStatus('error');
        setMessage('Missing verification token. Please request a new confirmation email.');
        setTimeout(() => {
          router.replace(withQuery(LOGIN, { error: 'missing_token' }));
        }, 3000);
        return;
      }

      try {
        let result;

        // Prefer token_hash method (newer & recommended)
        if (tokenHash && otpType) {
          result = await supabaseBrowser().auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any,
          });
        }
        // Fallback for ?code= (older magic link / PKCE style)
        else if (code) {
          result = await supabaseBrowser().auth.exchangeCodeForSession(code);
        }
        else {
          throw new Error('No valid verification parameter found');
        }

        if (result.error) {
          throw result.error;
        }

        // Force session refresh (helps in some edge cases)
        const { data: sessionData } = await supabaseBrowser().auth.getSession();

        if (!sessionData.session) {
          throw new Error('Session not created after verification');
        }

        // Optional: you can call your server-side session bridge if needed
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              event: 'SIGNED_IN',
              session: sessionData.session,
            }),
          });
        } catch (bridgeErr) {
          console.warn('Session bridge call failed (non-critical)', bridgeErr);
        }

        setStatus('success');
        setMessage('Email verified successfully! Redirecting...');

        // Determine final destination
        let destination = ONBOARDING;

        if (typeof next === 'string' && next.startsWith('/')) {
          destination = next;
        }

        // Small delay so user sees success message
        setTimeout(() => {
          router.replace(destination);
        }, 1200);

      } catch (err: any) {
        console.error('Email verification failed:', err);
        setStatus('error');
        setMessage(
          err.message?.includes('expired')
            ? 'This verification link has expired. Please request a new one.'
            : err.message || 'Verification failed. Please try again or contact support.'
        );

        setTimeout(() => {
          router.replace(withQuery(LOGIN, { error: 'verification_failed' }));
        }, 4000);
      }
    };

    handleVerification();
  }, [router.isReady, router.query, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <div className="mb-6 text-5xl">⌛</div>
            <h2 className="mb-3 text-xl font-semibold">Verifying your email</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6 text-6xl">✅</div>
            <h2 className="mb-3 text-xl font-semibold text-green-600 dark:text-green-400">
              Email Verified!
            </h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6 text-6xl">❌</div>
            <h2 className="mb-3 text-xl font-semibold text-destructive">
              Verification Problem
            </h2>
            <p className="mb-6 text-muted-foreground">{message}</p>
            <button
              onClick={() => router.replace(LOGIN)}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}