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
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { destinationByRole } from '@/lib/routeAccess';

type AuthMode = 'login' | 'signup';
type OAuthProvider = 'apple' | 'google' | 'facebook';

interface AuthOptionsProps {
  mode: AuthMode;
}

export default function AuthOptions({ mode }: AuthOptionsProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const ref = mode === 'signup' && typeof router.query.ref === 'string' ? router.query.ref : '';
  const rawNext = typeof router.query.next === 'string' ? router.query.next : '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';
  const actionVerb = mode === 'login' ? 'Sign in' : 'Sign up';
  const sharedQS = useMemo(() => {
    const qp = new URLSearchParams();
    if (selectedRole) qp.set('role', selectedRole);
    if (mode === 'signup' && ref) qp.set('ref', ref);
    if (next) qp.set('next', next);
    const s = qp.toString();
    return s ? `?${s}` : '';
  }, [mode, next, ref, selectedRole]);

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      let shouldShowAuthOptions = true;

      try {
        const {
          data: { session },
          error,
        } = await supabaseBrowser.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Failed to get session:', error);
          return;
        }

        if (session) {
          shouldShowAuthOptions = false;
          const blockedPath = mode === 'login' ? '/login' : '/signup';
          const safe =
            next && next !== blockedPath
              ? next
              : destinationByRole(session.user);

          if (router.asPath !== safe) {
            try {
              await router.replace(safe);
            } catch (navigationError) {
              console.error('Failed to redirect after session detection:', navigationError);
              shouldShowAuthOptions = true;
            }
          }
        }
      } catch (err) {
        if (mounted) console.error('Error checking session:', err);
      } finally {
        if (mounted && shouldShowAuthOptions) setReady(true);
      }
    };
    void checkSession();
    return () => {
      mounted = false;
    };
  }, [mode, next, router]);

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
    const { role: _role, ...rest } = router.query as Record<string, unknown>;
    router.replace({ pathname: router.pathname, query: { ...rest } }, undefined, { shallow: true });
  }

  async function oauth(provider: OAuthProvider) {
    try {
      setErr(null);
      setBusy(provider);

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      let nextPath = next;
      if (!nextPath) {
        if (mode === 'login') {
          nextPath = `/dashboard${selectedRole ? `?role=${encodeURIComponent(selectedRole)}` : ''}`;
        } else {
          const qs = new URLSearchParams();
          if (selectedRole) qs.set('role', selectedRole);
          if (ref) qs.set('ref', ref);
          const suffix = qs.toString();
          nextPath = `/welcome${suffix ? `?${suffix}` : ''}`;
        }
      }

      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        console.error(`OAuth error for ${provider}:`, error);
        throw error;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to sign in. Please try again.';
      console.error('OAuth sign-in failed:', e);
      setErr(message);
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return (
      <div className="p-6 text-mutedText" aria-live="polite">
        {mode === 'login' ? 'Checking session… Please wait.' : 'Preparing sign up… Please wait.'}
      </div>
    );
  }

  return (
    <>
      {err && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      {!selectedRole ? (
        <>
          <SectionLabel>{mode === 'login' ? 'Sign in as' : 'Sign up as'}</SectionLabel>

          <div className="grid gap-3">
            <Button
              onClick={() => chooseRole('student')}
              variant="soft"
              tone="primary"
              size="lg"
              shape="rounded"
              fullWidth
              elevateOnHover
              className="justify-center"
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
              className="justify-center"
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

          {mode === 'signup' ? (
            <p className="mt-6 text-small text-mutedText">
              Already have an account?{' '}
              <Link href={`/login${sharedQS}`} className="text-primary hover:underline hover:text-primary/80 transition">
                Log in
              </Link>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <SectionLabel>{mode === 'login' ? 'Sign in' : 'Create account'}</SectionLabel>

          <div className="grid gap-3">
            {mode === 'login' ? (
              <Link
                href={`/login/email${sharedQS}`}
                className="btn btn-primary rounded-ds-xl w-full inline-flex items-center justify-center gap-2"
              >
                <MailIcon className="h-5 w-5" />
                <span>Email &amp; Password</span>
              </Link>
            ) : (
              <Button
                href={`/signup/email${sharedQS}`}
                variant="primary"
                size="lg"
                shape="rounded"
                fullWidth
                leadingIcon={<MailIcon className="h-5 w-5" />}
              >
                Sign up with Email
              </Button>
            )}

            <Button
              onClick={() => oauth('google')}
              loading={busy === 'google'}
              loadingText="Opening Google…"
              variant="soft"
              tone="primary"
              size="lg"
              shape="rounded"
              fullWidth
              leadingIcon={<GoogleIcon className="h-5 w-5" />}
              aria-label={`${actionVerb} with Google`}
            >
              {actionVerb} with Google
            </Button>

            <Button
              onClick={() => oauth('facebook')}
              loading={busy === 'facebook'}
              loadingText="Opening Facebook…"
              variant="soft"
              tone="accent"
              size="lg"
              shape="rounded"
              fullWidth
              leadingIcon={<FacebookIcon className="h-5 w-5" />}
              aria-label={`${actionVerb} with Facebook`}
            >
              {actionVerb} with Facebook
            </Button>

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
              <span>{actionVerb} with Apple</span>
              <Badge variant="info" size="sm" className="absolute top-2 right-3 text-caption px-2 py-0.5">
                Coming Soon
              </Badge>
            </Button>

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
              <span>Phone (OTP)</span>
              <Badge variant="info" size="sm" className="absolute top-2 right-3 text-caption px-2 py-0.5">
                Coming Soon
              </Badge>
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between text-small text-mutedText">
            <div>
              {mode === 'login' ? 'New here? ' : 'Already have an account? '}
              <Link
                href={mode === 'login' ? `/signup${sharedQS}` : `/login${sharedQS}`}
                className="text-primary hover:underline hover:text-primary/80 transition"
              >
                {mode === 'login' ? 'Create an account' : 'Log in'}
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