import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Input } from '@/components/design-system/Input';
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';

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
  const router = useRouter();
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();

  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [remaining, setRemaining] = React.useState<number | null>(null);

  // Clear message after 5 seconds on success
  React.useEffect(() => {
    if (message?.kind === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pin || loading) return;

    // 4–6 digit numeric PIN
    if (!/^\d{4,6}$/.test(pin)) {
      const errorMsg = t('redeem.pin.invalid', 'Enter a valid PIN (4–6 digits, numbers only).');
      setMessage({ kind: 'error', text: errorMsg });
      toastError(errorMsg);
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
        const formatted = !Number.isNaN(expires.getTime())
          ? t('redeem.success.expires', 'Access renews on {{date}}.', {
              date: expires.toLocaleDateString(),
            })
          : '';
        const successMsg = t(
          'redeem.success.message',
          'Welcome to {{plan}}! {{expires}}',
          {
            plan:
              data.plan === 'master'
                ? 'Master'
                : data.plan === 'booster'
                ? 'Booster'
                : 'Starter',
            expires: formatted,
          }
        );
        setMessage({ kind: 'success', text: successMsg });
        toastSuccess(successMsg);
        setPin('');
        setRemaining(null);

        // Redirect to account page after short delay
        setTimeout(() => {
          router.push('/account');
        }, 2000);
      } else {
        const err = data.ok
          ? t('redeem.error.generic', 'Unable to redeem PIN.')
          : data.error || t('redeem.error.generic', 'Unable to redeem PIN.');
        setMessage({ kind: 'error', text: err });
        toastError(err);
        if (!data.ok && typeof data.remainingAttempts === 'number') {
          setRemaining(Math.max(data.remainingAttempts, 0));
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('redeem-pin failed', error);
      const errMsg = t('redeem.error.network', 'Network error. Please try again.');
      setMessage({ kind: 'error', text: errMsg });
      toastError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('redeem.pageTitle', 'Redeem Premium PIN · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'redeem.pageDescription',
            'Redeem your Premium PIN to unlock paid plans without entering payment details.'
          )}
        />
      </Head>

      <main className="min-h-screen bg-background text-foreground py-8">
        <Container className="max-w-2xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-h2 font-semibold text-foreground">
              {t('redeem.title', 'Redeem Premium PIN')}
            </h1>
            <p className="text-small text-muted-foreground">
              {t(
                'redeem.subtitle',
                'Enter the one-time PIN shared by our team to instantly unlock premium access.'
              )}
            </p>
          </header>

          <Card padding="lg" insetBorder>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Input
                  label={t('redeem.pin.label', 'PIN')}
                  placeholder={t('redeem.pin.placeholder', 'Enter 4–6 digit PIN')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  autoComplete="one-time-code"
                  required
                  aria-describedby="pin-hint"
                />
                <p id="pin-hint" className="text-caption text-muted-foreground">
                  {t(
                    'redeem.pin.hint',
                    'PINs expire after use. Each code can be redeemed once per account.'
                  )}
                </p>
              </div>

              {message && (
                <Alert
                  variant={message.kind === 'success' ? 'success' : 'error'}
                  appearance="soft"
                  title={
                    message.kind === 'success'
                      ? t('common.success', 'Success')
                      : t('common.error', 'Error')
                  }
                  role={message.kind === 'error' ? 'alert' : 'status'}
                >
                  <p className="mt-1 text-small text-muted-foreground">
                    {message.text}
                  </p>
                  {remaining !== null &&
                    remaining >= 0 &&
                    message.kind === 'error' && (
                      <p className="mt-2 text-caption text-muted-foreground">
                        {t(
                          'redeem.remainingAttempts',
                          'Attempts left before lockout: {{count}}',
                          { count: remaining }
                        )}
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
                  {loading
                    ? t('common.checking', 'Checking…')
                    : t('redeem.submit', 'Redeem PIN')}
                </Button>
                <Badge variant="secondary">
                  {t('redeem.oneTimeUse', 'One-time use')}
                </Badge>
              </div>
            </form>
          </Card>

          <Card padding="lg" className="space-y-3 bg-muted/30">
            <h2 className="text-h5 font-semibold text-foreground">
              {t('redeem.needPin.title', 'Need a PIN?')}
            </h2>
            <p className="text-small text-muted-foreground">
              {t(
                'redeem.needPin.description',
                'Premium PINs are issued during onboarding and private offers. If you believe you should have one, contact our success team.'
              )}
            </p>
            <div>
              <Button asChild variant="link" size="sm">
                <Link href="mailto:hello@gramorx.com">
                  {t('redeem.needPin.email', 'Email support')}
                </Link>
              </Button>
            </div>
          </Card>
        </Container>
      </main>
    </>
  );
}