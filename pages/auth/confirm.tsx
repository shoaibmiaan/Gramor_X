// pages/auth/confirm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import {
  exchangeCodeForSession,
  getCurrentSession,
  getProfileRoleAndOnboarding,
  setClientSession,
  syncServerSession,
  verifyOtpWithTokenHash,
} from '@/lib/auth';
import { LOGIN, withQuery } from '@/lib/constants/routes';

function resolveDestination(role: string, onboardingDone: boolean, redirectAfter: string | null) {
  if (redirectAfter) return redirectAfter;

  switch (role) {
    case 'student':
      return onboardingDone ? '/dashboard' : '/welcome';
    case 'teacher':
      return onboardingDone ? '/teacher/dashboard' : '/onboarding/teacher';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/onboarding/welcome';
  }
}

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email… Please wait.');

  useEffect(() => {
    if (!router.isReady) return;

    const verifyAndRedirect = async () => {
      const { token_hash, code, type, next } = router.query;

      const tokenHash = typeof token_hash === 'string' ? token_hash : null;
      const otpType = typeof type === 'string' ? type : 'signup';
      const verificationCode = typeof code === 'string' ? code : null;
      const redirectAfter = typeof next === 'string' && next.startsWith('/') ? next : null;

      if (!tokenHash && !verificationCode) {
        setStatus('error');
        setMessage('Missing verification token. Please request a new email.');
        setTimeout(() => {
          void router.replace(withQuery(LOGIN, { error: 'missing_token' }));
        }, 3000);
        return;
      }

      try {
        if (tokenHash) {
          const result = await verifyOtpWithTokenHash(otpType, tokenHash);
          if (result.error) throw result.error;
          if (result.data?.session) await setClientSession(result.data.session);
        } else if (verificationCode) {
          const result = await exchangeCodeForSession(verificationCode);
          if (result.error) throw result.error;
          if (result.data?.session) await setClientSession(result.data.session);
        }

        const session = await getCurrentSession();
        if (!session?.user) throw new Error('No active session after verification');

        await syncServerSession(session);

        const { data: profile, error: profileErr } = await getProfileRoleAndOnboarding(session.user.id);
        if (profileErr) {
          setStatus('error');
          setMessage('Profile lookup failed. Please sign in again.');
          setTimeout(() => {
            void router.replace(withQuery(LOGIN, { error: 'profile_lookup_failed' }));
          }, 3000);
          return;
        }

        const role = String(profile?.role || 'student').toLowerCase();
        const onboardingDone = Boolean(profile?.onboarding_completed);
        const destination = resolveDestination(role, onboardingDone, redirectAfter);

        setStatus('success');
        setMessage('Email verified! Taking you to your dashboard...');
        setTimeout(() => {
          void router.replace(destination);
        }, 1400);
      } catch (err: any) {
        let userMessage = 'Verification failed. Please try again.';

        if (err?.message?.includes('expired')) {
          userMessage = 'This link has expired. Please request a new confirmation email.';
        } else if (err?.message?.includes('already confirmed')) {
          userMessage = 'Email is already verified. You can sign in normally.';
        } else if (err?.message?.includes('invalid')) {
          userMessage = 'Invalid verification link. Please use the latest email.';
        }

        setStatus('error');
        setMessage(userMessage);

        setTimeout(() => {
          void router.replace(withQuery(LOGIN, { error: 'verification_failed' }));
        }, 4500);
      }
    };

    void verifyAndRedirect();
  }, [router, router.isReady]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/30">
      <section className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl text-center space-y-4">
        {status === 'loading' && <div className="animate-spin mx-auto h-8 w-8 rounded-full border-2 border-muted border-t-foreground" />}
        {status === 'success' && <div className="mx-auto h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center">✓</div>}
        {status === 'error' && <div className="mx-auto h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">!</div>}

        <h1 className="text-xl font-semibold">
          {status === 'loading' && 'Verifying...'}
          {status === 'success' && 'Success'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        <p className="text-sm text-muted-foreground">{message}</p>
      </section>
    </main>
  );
}
