import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Input } from '@/components/design-system/Input';

type RedeemSuccess = {
  ok: true;
  plan: 'starter' | 'booster' | 'master';
  premiumExpiresAt: string;
};

type RedeemFailure = {
  ok: false;
  error: string;
  remainingAttempts?: number;
};

type RedeemResponse = RedeemSuccess | RedeemFailure;

export default function RedeemPinPage() {
  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [remaining, setRemaining] = React.useState<number | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pin || loading) return;

    // 4–6 digit numeric PIN
    if (!/^\d{4,6}$/.test(pin)) {
      setMessage({
        kind: 'error',
        text: 'Enter a valid PIN (4–6 digits, numbers only).',
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    setRemaining(null);

    try {
      const res = await fetch('/api/account/redeem-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as RedeemResponse;

      if (res.ok && data.ok) {
        const expires = new Date(data.premiumExpiresAt);
        const formatted = Number.isNaN(expires.getTime())
          ? ''
          : ` Access renews on ${expires.toLocaleDateString()}.`;
        setMessage({
          kind: 'success',
          text: `Welcome to ${
            data.plan === 'master'
              ? 'Master'
              : data.plan === 'booster'
              ? 'Booster'
              : 'Starter'
          }!${formatted}`,
        });
        setPin('');
        setRemaining(null);
      } else {
        const err = data.ok
          ? 'Unable to redeem PIN.'
          : data.error || 'Unable to redeem PIN.';
        setMessage({ kind: 'error', text: err });
        if (!data.ok && typeof data.remainingAttempts === 'number') {
          setRemaining(Math.max(data.remainingAttempts, 0));
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('redeem-pin failed', error);
      setMessage({
        kind: 'error',
        text: 'Network error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Redeem Premium PIN · GramorX</title>
        <meta
          name="description"
          content="Redeem your Premium PIN to unlock paid plans without entering payment details."
        />
      </Head>

      <main className="min-h-screen bg-background text-foreground py-8">
        <Container className="max-w-2xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-h2 font-semibold text-foreground">
              Redeem Premium PIN
            </h1>
            <p className="text-small text-muted-foreground">
              Enter the one-time PIN shared by our team to instantly unlock
              premium access.
            </p>
          </header>

          <Card padding="lg" insetBorder>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Input
                  label="PIN"
                  placeholder="Enter 4–6 digit PIN"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  autoComplete="one-time-code"
                  required
                />
                <p className="text-caption text-muted-foreground">
                  PINs expire after use. Each code can be redeemed once per
                  account.
                </p>
              </div>

              {message && (
                <Alert
                  variant={
                    message.kind === 'success' ? 'success' : 'error'
                  }
                  appearance="soft"
                  title={
                    message.kind === 'success'
                      ? 'Success'
                      : 'We couldn’t verify that PIN'
                  }
                >
                  <p className="mt-1 text-small text-muted-foreground">
                    {message.text}
                  </p>
                  {remaining !== null &&
                    remaining >= 0 &&
                    message.kind === 'error' && (
                      <p className="mt-2 text-caption text-muted-foreground">
                        Attempts left before lockout:{' '}
                        <span className="font-medium">{remaining}</span>
                      </p>
                    )}
                </Alert>
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading || pin.length < 4}
                >
                  {loading ? 'Checking…' : 'Redeem PIN'}
                </Button>
                <Badge variant="secondary">One-time use</Badge>
              </div>
            </form>
          </Card>

          <Card padding="lg" className="space-y-3 bg-muted/30">
            <h2 className="text-h5 font-semibold text-foreground">
              Need a PIN?
            </h2>
            <p className="text-small text-muted-foreground">
              Premium PINs are issued during onboarding and private offers. If
              you believe you should have one, contact our success team.
            </p>
            <div>
              <Button asChild variant="link" size="sm">
                <Link href="mailto:hello@gramorx.com">Email support</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </main>
    </>
  );
}
