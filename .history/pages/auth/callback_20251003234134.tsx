'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '@/components/layouts/AuthLayout';
import { Alert } from '@/components/design-system/Alert';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser
import { redirectByRole } from '@/lib/routeAccess';

export default function AuthCallback() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const handleCallback = async () => {
      try {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const code = sp.get('code');
        const urlError = sp.get('error_description') || sp.get('error');

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

        try {
          const res = await fetch('/api/auth/login-event', {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          if (!res.ok) console.error('Failed to log login event:', res.status);
        } catch (err) {
          console.error('Error logging login event:', err);
        }

        const user = data.session.user;
        const mfaEnabled = user.user_metadata?.mfa_enabled;
        const mfaVerified = user.user_metadata?.mfa_verified;
        if (mfaEnabled && !mfaVerified) {
          if (mounted) window.location.assign('/auth/mfa');
          return;
        }
        if (mounted) redirectByRole(user);
      } catch (err) {
        console.error('Callback error:', err);
        if (mounted) setErr('An unexpected error occurred. Please try again.');
      }
    };
    handleCallback();
    return () => {
      mounted = false;
    };
  }, []);

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