// pages/auth/confirm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { LOGIN } from '@/lib/constants/routes';
import { withQuery } from '@/lib/constants/routes';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email… Please wait.');

  useEffect(() => {
    if (!router.isReady) return;

    const verifyAndRedirect = async () => {
      const { token_hash, code, type, next } = router.query;

      // ────────────────────────────────────────────────
      // Extract parameters
      // ────────────────────────────────────────────────
      const tokenHash = typeof token_hash === 'string' ? token_hash : null;
      const otpType = typeof type === 'string' ? type : 'signup';
      const verificationCode = typeof code === 'string' ? code : null;
      const redirectAfter = typeof next === 'string' && next.startsWith('/') ? next : null;

      console.log('[confirm] Received query:', router.query);

      if (!tokenHash && !verificationCode) {
        setStatus('error');
        setMessage('Missing verification token. Please request a new email.');
        setTimeout(() => {
          router.replace(withQuery(LOGIN, { error: 'missing_token' }));
        }, 3000);
        return;
      }

      try {
        let result;

        // Preferred method: token_hash (most common in recent Supabase)
        if (tokenHash) {
          console.log('[confirm] Verifying with token_hash');
          result = await supabaseBrowser().auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any,
          });
        }
        // Fallback: code exchange (older / some PKCE flows)
        else if (verificationCode) {
          console.log('[confirm] Verifying with code exchange');
          result = await supabaseBrowser().auth.exchangeCodeForSession(verificationCode);
        }

        if (result?.error) {
          throw result.error;
        }

        // Get fresh session
        const {
          data: { session },
        } = await supabaseBrowser().auth.getSession();

        if (!session?.user) {
          throw new Error('No active session after verification');
        }

        // Optional bridge to server (if you use it)
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ event: 'SIGNED_IN', session }),
          });
        } catch (bridgeErr) {
          console.warn('Bridge call failed (non-critical)', bridgeErr);
        }

        // ────────────────────────────────────────────────
        // Get user role from profiles table
        // ────────────────────────────────────────────────
        const { data: profile, error: profileErr } = await supabaseBrowser()
          .from('profiles')
          .select('role, onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (profileErr) {
          console.warn('Profile fetch failed:', profileErr.message);
        }

        const role = (profile?.role || 'student').toLowerCase();
        const onboardingDone = !!profile?.onboarding_completed;

        // ────────────────────────────────────────────────
        // Role-based destination
        // ────────────────────────────────────────────────
        let destination = '/onboarding/welcome';

        if (redirectAfter) {
          destination = redirectAfter;
        } else {
          switch (role) {
            case 'student':
              destination = onboardingDone ? '/dashboard' : '/welcome';
              break;

            case 'teacher':
              destination = onboardingDone ? '/teacher/dashboard' : '/onboarding/teacher';
              break;

            case 'admin':
              destination = '/admin/dashboard';
              break;

            default:
              destination = '/onboarding/welcome';
          }
        }

        console.log('[confirm] Redirecting to:', destination);

        setStatus('success');
        setMessage('Email verified! Taking you to your dashboard...');

        // Give user time to see success message
        setTimeout(() => {
          router.replace(destination);
        }, 1400);
      } catch (err: any) {
        console.error('[confirm] Error during verification:', err);

        let userMessage = 'Verification failed. Please try again.';

        if (err.message?.includes('expired')) {
          userMessage = 'This link has expired. Please request a new confirmation email.';
        } else if (err.message?.includes('already confirmed')) {
          userMessage = 'Email is already verified. You can sign in normally.';
        } else if (err.message?.includes('invalid')) {
          userMessage = 'Invalid verification link. Please use the latest email.';
        }

        setStatus('error');
        setMessage(userMessage);

        setTimeout(() => {
          router.replace(withQuery(LOGIN, { error: 'verification_failed' }));
        }, 4500);
      }
    };

    verifyAndRedirect();
  }, [router.isReady, router.query, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="mb-4 text-2xl font-semibold">Verifying your email</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-6 text-7xl">✅</div>
            <h2 className="mb-4 text-2xl font-bold text-green-600 dark:text-green-400">
              Email Verified!
            </h2>
            <p className="text-lg text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-6 text-7xl">❌</div>
            <h2 className="mb-4 text-2xl font-bold text-destructive">Verification Failed</h2>
            <p className="mb-6 text-muted-foreground">{message}</p>
            <button
              onClick={() => router.replace(LOGIN)}
              className="mt-4 rounded-xl bg-primary px-8 py-3 font-medium text-white hover:bg-primary/90 transition"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
