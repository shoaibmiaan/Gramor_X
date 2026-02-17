// pages/forgot-password.tsx
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Icon } from '@/components/design-system/Icon';

const ForgotPassword: NextPage = () => {
  const [email, setEmail] = useState<string>('');
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        throw new Error(data.error || data.message || 'Could not send reset email. Please try again.');
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Forgot Password</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="min-h-[100dvh] flex items-center">
        <Container className="w-full">
          <div className="mx-auto max-w-md">
            <Card className="p-6 md:p-8">
              <div className="mb-6 text-center">
                <h1 className="text-h2 font-semibold">Reset your password</h1>
                <p className="text-muted mt-2 text-small">
                  Enter the email you used to sign up. We’ll send a secure link to reset your password.
                </p>
              </div>

              {sent ? (
                <div className="space-y-4">
                  <Alert variant="success">
                    If an account exists for <strong>{email}</strong>, a reset link has been sent.
                  </Alert>

                  <div className="grid gap-3">
                    <Button asChild>
                      <a href="mailto:">Open email app</a>
                    </Button>
                    <Button variant="secondary" asChild>
                      <Link href="/login">Back to login</Link>
                    </Button>
                  </div>

                  <p className="text-xs text-muted mt-2">
                    Didn’t get it? Check spam/junk or try another email you might have used.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="email" className="text-small">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      className="mt-1"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {error && (
                    <Alert variant="danger">
                      <Icon name="alert-triangle" className="mr-2 inline-block align-middle" />
                      <span className="align-middle">{error}</span>
                    </Alert>
                  )}

                  <Button type="submit" disabled={submitting || !email}>
                    {submitting ? (
                      <>
                        <Icon name="loader" className="mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>

                  <div className="text-small text-center">
                    Remembered your password?{' '}
                    <Link href="/login" className="underline">
                      Back to login
                    </Link>
                  </div>
                </form>
              )}
            </Card>

            {/* Auth footer links to mirror signup surface */}
            <div className="mt-4 text-center text-small text-muted">
              <span>Don’t have an account? </span>
              <Link href="/signup" className="underline">
                Create one
              </Link>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
};

export default ForgotPassword;
