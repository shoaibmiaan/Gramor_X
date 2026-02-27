// pages/forgot-password.tsx
'use client';

import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

import AuthLayout from '@/components/layouts/AuthLayout';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Icon } from '@/components/design-system/Icon';

const ForgotPassword: NextPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Failed to send reset email');
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Forgot Password | GramorX</title>
        <meta name="robots" content="noindex" />
      </Head>

      <AuthLayout
        title="Reset your password"
        subtitle="Enter your email to receive a reset link."
      >
        {sent ? (
          <div className="space-y-4">
            <Alert variant="success">
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
            </Alert>
            <Button variant="secondary" asChild className="w-full">
              <Link href="/login">Back to login options</Link>
            </Button>
            <p className="text-xs text-muted text-center">
              Didn’t get it? Check spam or try another email.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm">Email</label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="danger">
                  <Icon name="alert-triangle" className="mr-2 inline-block" />
                  {error}
                </Alert>
              )}

              <Button type="submit" disabled={submitting || !email} className="w-full">
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>

              <p className="text-xs text-muted text-center">
                Remembered your password?{' '}
                <Link href="/login" className="underline">Login</Link>
              </p>
            </form>

            {/* Bottom actions – matches pattern from login/email.tsx */}
            <div className="mt-6 space-y-2">
              <Button asChild variant="secondary" className="w-full">
                <Link href="/login">Back to login options</Link>
              </Button>
              <p className="text-caption text-mutedText text-center">
                By continuing you agree to our{' '}
                <Link href="/legal/terms" className="underline">Terms</Link> &amp;{' '}
                <Link href="/legal/privacy" className="underline">Privacy</Link>.
              </p>
            </div>
          </>
        )}
      </AuthLayout>
    </>
  );
};

export default ForgotPassword;