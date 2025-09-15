'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import {
  AppleIcon,
  GoogleIcon,
  FacebookIcon,
  MailIcon,
  SmsIcon,
} from '@/components/design-system/icons';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { destinationByRole } from '@/lib/routeAccess';

type Provider = 'apple' | 'google' | 'facebook';
type AuthMode = 'login' | 'signup';

interface AuthOptionsProps {
  mode: AuthMode;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-small uppercase tracking-wide text-mutedText">
      {children}
    </div>
  );
}

export default function AuthOptions({ mode }: AuthOptionsProps) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isSignup = mode === 'signup';
  const referral = isSignup && typeof router.query.ref === 'string' ? router.query.ref : '';

  // Only redirect away from /login or /signup if we DEFINITELY have a session
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        const rawNext = typeof router.query.next === 'string' ? router.query.next : '';
        const forbiddenPath = `/${mode}`;
        const safe =
          rawNext && !rawNext.startsWith('http') && rawNext !== forbiddenPath
            ? rawNext
            : destinationByRole(session.user);
        if (router.asPath !== safe) {
          await router.replace(safe);
          return;
        }
      }
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [mode, router.asPath, router.query.next, router.replace]);

  // Persist role in query + localStorage
  useEffect(() => {
    if (!router.isReady) return;
    const roleQuery = typeof router.query.role === 'string' ? router.query.role : null;

    if (roleQuery) {
      setSelectedRole(roleQuery);
      if (typeof window !== 'undefined') localStorage.setItem('selectedRole', roleQuery);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedRole');
      if (stored) {
        setSelectedRole(stored);
        router.replace(
          { pathname: router.pathname, query: { ...router.query, role: stored } },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [router]);

  function chooseRole(role: string) {
    setSelectedRole(role);
    if (typeof window !== 'undefined') localStorage.setItem('selectedRole', role);
    router.replace(
      { pathname: router.pathname, query: { ...router.query, role } },
      undefined,
      { shallow: true }
    );
  }

  function clearRole() {
    setSelectedRole(null);
    if (typeof window !== 'undefined') localStorage.removeItem('selectedRole');
    const { role, ...rest } = router.query as Record<string, any>;
    router.replace({ pathname: router.pathname, query: { ...rest } }, undefined, { shallow: true });
  }

  const roleQueryString = useMemo(() => {
    if (!selectedRole) return '';
    const params = new URLSearchParams();
    params.set('role', selectedRole);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [selectedRole]);

  const linkQS = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedRole) params.set('role', selectedRole);
    if (isSignup && referral) params.set('ref', referral);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [isSignup, referral, selectedRole]);

  async function oauth(provider: Provider) {
    try {
      setErr(null);
      setBusy(provider);

      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const params = new URLSearchParams();
      if (selectedRole) params.set('role', selectedRole);
      if (isSignup && referral) params.set('ref', referral);
      const qs = params.toString();
      const nextBase = isSignup ? '/onboarding/goal' : '/dashboard';
      const next = `${nextBase}${qs ? `?${qs}` : ''}`;
      const redirectTo = origin ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to continue.';
      setErr(message);
      setBusy(null);
    }
  }

  if (!ready) {
    return (
      <div className="p-6 text-mutedText" aria-live="polite">
        {isSignup ? 'Preparing sign up… Please wait.' : 'Checking session… Please wait.'}
      </div>
    );
  }

  const rolePrompt = isSignup ? 'Sign up as' : 'Sign in as';
  const actionLabel = isSignup ? 'Create account' : 'Sign in';
  const emailCtaLabel = isSignup ? 'Sign up with Email' : 'Email & Password';
  const googleCtaLabel = isSignup ? 'Sign up with Google' : 'Sign in with Google';
  const facebookCtaLabel = isSignup ? 'Sign up with Facebook' : 'Sign in with Facebook';
  const appleCtaLabel = isSignup ? 'Sign up with Apple' : 'Sign in with Apple';
  const phoneCtaLabel = isSignup ? 'Phone (OTP)' : 'Phone (OTP)';

  const emailHref = isSignup ? `/signup/email${linkQS}` : `/login/email${roleQueryString}`;
  const crossLink = isSignup
    ? { message: 'Already have an account? ', label: 'Log in', href: `/login${linkQS}` }
    : { message: 'New here? ', label: 'Create an account', href: `/signup${roleQueryString}` };

  return (
    <>
      {err && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      {!selectedRole ? (
        <>
          <SectionLabel>{rolePrompt}</SectionLabel>

          <div className="grid gap-3">
            <Button
              onClick={() => chooseRole('student')}
              variant="soft"
              tone="primary"
              size="lg"
              shape="rounded"
              fullWidth
              elevateOnHover
              className="justify-between"
              trailingIcon={<span className="text-mutedText">→</span>}
            >
              <span className="font-medium">Student</span>
            </Button>

            <Button
              onClick={() => chooseRole('teacher')}
              variant="soft"
              tone="accent"
              size="lg"
              shape="rounded"
              fullWidth
              elevateOnHover
              className="justify-between"
              trailingIcon={<span className="text-mutedText">→</span>}
            >
              <span className="font-medium">Teacher</span>
            </Button>
          </div>

          <div className="mt-6 text-small text-mutedText">
            By continuing, you agree to our{' '}
            <Link href="/legal/terms" className="text-primary hover:underline hover:text-primary/80 transition">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="text-primary hover:underline hover:text-primary/80 transition">
              Privacy Policy
            </Link>
            .
          </div>

          {isSignup && (
            <p className="mt-6 text-small text-mutedText">
              Already have an account?{' '}
              <Link
                href={`/login${linkQS}`}
                className="text-primary hover:underline hover:text-primary/80 transition"
              >
                Log in
              </Link>
            </p>
          )}
        </>
      ) : (
        <>
          <SectionLabel>{actionLabel}</SectionLabel>

          <div className="grid gap-3">
            <Button
              href={emailHref}
              variant="primary"
              size="lg"
              shape="rounded"
              fullWidth
              className="rounded-ds-xl"
              leadingIcon={<MailIcon className="h-5 w-5" />}
            >
              {emailCtaLabel}
            </Button>

            {/* Google */}
            <Button
              onClick={() => oauth('google')}
              loading={busy === 'google'}
              loadingText={`Opening Google…`}
              variant="soft"
              tone="primary"
              size="lg"
              shape="rounded"
              fullWidth
              leadingIcon={<GoogleIcon className="h-5 w-5" />}
              aria-label={googleCtaLabel}
            >
              {googleCtaLabel}
            </Button>

            {/* Facebook */}
            <Button
              onClick={() => oauth('facebook')}
              loading={busy === 'facebook'}
              loadingText={`Opening Facebook…`}
              variant="soft"
              tone="accent"
              size="lg"
              shape="rounded"
              fullWidth
              leadingIcon={<FacebookIcon className="h-5 w-5" />}
              aria-label={facebookCtaLabel}
            >
              {facebookCtaLabel}
            </Button>

            {/* Apple (disabled) */}
            <Button
              disabled
              variant="soft"
              tone="secondary"
              size="lg"
              shape="rounded"
              fullWidth
              className="relative justify-start opacity-75"
              leadingIcon={<AppleIcon className="h-5 w-5" />}
              aria-disabled="true"
            >
              <span>{appleCtaLabel}</span>
              <Badge variant="info" size="sm" className="absolute top-2 right-3 text-caption px-2 py-0.5">
                Coming Soon
              </Badge>
            </Button>

            {/* Phone (OTP) */}
            <Button
              disabled
              variant="soft"
              tone="secondary"
              size="lg"
              shape="rounded"
              fullWidth
              className="relative justify-start opacity-75"
              leadingIcon={<SmsIcon className="h-5 w-5" />}
              aria-disabled="true"
            >
              <span>{phoneCtaLabel}</span>
              <Badge variant="info" size="sm" className="absolute top-2 right-3 text-caption px-2 py-0.5">
                Coming Soon
              </Badge>
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between text-small text-mutedText">
            <div>
              {crossLink.message}
              <Link
                href={crossLink.href}
                className="text-primary hover:underline hover:text-primary/80 transition"
              >
                {crossLink.label}
              </Link>
            </div>
            <Button variant="link" onClick={clearRole} aria-label="Change selected role">
              Change role
            </Button>
          </div>
        </>
      )}
    </>
  );
}
