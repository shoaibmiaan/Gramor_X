'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AuthLayout from '@/components/layouts/AuthLayout';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { redirectByRole } from '@/lib/routeAccess';

export default function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        // Supabase puts ?code=... in the URL
        const sp = new URLSearchParams(window.location.search);
        const code = sp.get('code');
        const urlError = sp.get('error_description') || sp.get('error');
        const next = sp.get('next') || '';

        if (urlError) {
          if (mounted) setErr(urlError);
          return;
        }
        if (!code) {
          if (mounted) setErr('Missing authorization code. Please try signing in again.');
          return;
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (mounted) setErr(error.message);
          return;
        }
        if (!data.session) {
          if (mounted) setErr('No active session. Please try signing in again.');
          return;
        }

        // best-effort login event (non-blocking)
        try {
          fetch('/api/auth/login-event', {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          }).catch(() => {});
        } catch {}

        const user = data.session.user;

        // MFA gate (if you use it)
        const mfaEnabled = user.user_metadata?.mfa_enabled;
        const mfaVerified = user.user_metadata?.mfa_verified;
        if (mfaEnabled && !mfaVerified) {
          if (mounted) window.location.assign('/auth/mfa');
          return;
        }

        // Prefer explicit next
        if (next && !next.startsWith('http')) {
          await router.replace(next);
          return;
        }

        // Otherwise route by role
        await redirectByRole(user);
      } catch (e) {
        console.error('Callback error:', e);
        if (mounted) setErr('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
    return () => { mounted = false; };
  }, [router]);

  return (
    <AuthLayout title="Signing you in..." subtitle={err ? undefined : 'Please wait...'} showRightOnMobile>
      {err && (
        <Alert variant="warning" title="Error" className="mt-4">
          {err}
        </Alert>
      )}
    </AuthLayout>
  );
}
