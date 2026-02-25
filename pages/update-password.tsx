// pages/update-password.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '@/components/layouts/AuthLayout';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [recoveryExpired, setRecoveryExpired] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRecovery = async () => {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      // Check if error is already in hash (e.g., otp_expired)
      if (params.get('error')) {
        setRecoveryExpired(true);
        setError(
          params.get('error_description')?.replace(/\+/g, ' ') ||
            'Invalid or expired reset link.'
        );
        setProcessing(false);
        return;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (!accessToken || type !== 'recovery') {
        setRecoveryExpired(true);
        setError('Invalid reset link. Please request a new one.');
        setProcessing(false);
        return;
      }

      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          // Check if it's a network error
          if (sessionError.message?.includes('fetch failed') || sessionError.name === 'AuthRetryableFetchError') {
            setError('Network error: Unable to reach authentication server. Please check your internet connection and try again.');
          } else {
            setRecoveryExpired(true);
            setError(sessionError.message);
          }
        }
      } catch (err: any) {
        // Network or unexpected error
        setError('Network error: Unable to verify reset link. Please check your connection.');
      } finally {
        setProcessing(false);
      }
    };

    handleRecovery();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        // Distinguish network errors
        if (updateError.message?.includes('fetch failed') || updateError.name === 'AuthRetryableFetchError') {
          setError('Network error: Unable to connect to authentication server. Please check your internet and try again.');
        } else {
          setError(updateError.message);
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError('Network error: Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setProcessing(true);
    // Re-run the recovery logic (same as initial load)
    window.location.reload(); // simplest; could also re-run the effect
  };

  if (processing) {
    return (
      <AuthLayout title="Updating password" subtitle="Please wait...">
        <div className="text-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted">Verifying your reset link...</p>
        </div>
      </AuthLayout>
    );
  }

  // If the recovery link itself is expired or invalid
  if (recoveryExpired) {
    return (
      <AuthLayout title="Link expired" subtitle="Your password reset link is no longer valid.">
        <Alert variant="warning">
          {error}
        </Alert>
        <div className="mt-6 space-y-2">
          <Button asChild variant="primary" className="w-full">
            <Link href="/forgot-password">Request new link</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Network or other error during initial session setup
  if (error && !recoveryExpired) {
    return (
      <AuthLayout title="Connection issue" subtitle="We couldn't verify your reset link.">
        <Alert variant="danger">
          {error}
        </Alert>
        <div className="mt-6 space-y-2">
          <Button variant="primary" className="w-full" onClick={handleRetry}>
            Try again
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/forgot-password">Request new link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Normal password update form
  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter a new password for your account."
    >
      {success ? (
        <Alert variant="success">
          Password updated! Redirecting to login...
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="New password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <PasswordInput
            label="Confirm new password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </Button>

          <div className="text-xs text-muted text-center">
            <Link href="/login" className="underline">Back to login</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}