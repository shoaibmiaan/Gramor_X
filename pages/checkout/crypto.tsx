import * as React from 'react';

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { PLAN_LABEL } from '@/lib/payments/index';
import type { Cycle, PlanKey } from '@/types/payments';

const CRYPTO_NETWORKS = [
  {
    name: 'Bitcoin',
    network: 'BTC (on-chain)',
    address: 'bc1qx3p4l4m2n9u5u4z9s7k2djw9fy4mqg3a9c0r7x',
  },
  {
    name: 'Ethereum',
    network: 'ETH / ERC-20',
    address: '0x4B1a0fC2a1c18f4d32b1E0f32d9F1B7187B5cE90',
  },
  {
    name: 'USDT',
    network: 'USDT (TRC-20)',
    address: 'TW1PsrJ5c8tY9qr3C8i3Fz4J5x9Gq2Wm5P',
  },
] as const;

const fmtUsd = (amountCents?: number) => {
  if (!amountCents || Number.isNaN(amountCents)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
};

const CryptoCheckoutPage: NextPage = () => {
  const router = useRouter();
  const plan = (router.query.plan as PlanKey) ?? undefined;
  const cycle = (router.query.cycle as Cycle) ?? 'monthly';
  const intentId = (router.query.intent as string) ?? undefined;
  const amountParam = router.query.amount ? Number(router.query.amount) : undefined;
  const referralCode = router.query.code ? String(router.query.code) : undefined;
  const promoCode = router.query.promo ? String(router.query.promo) : undefined;

  const amountCents = Number.isFinite(amountParam ?? NaN) ? Number(amountParam) : undefined;
  const planLabel = plan ? PLAN_LABEL[plan] ?? plan : 'Selected plan';
  const cycleLabel = cycle === 'annual' ? 'Annual billing' : 'Monthly billing';

  const supportMailHref = React.useMemo(() => {
    const subject = encodeURIComponent('Crypto payment proof');
    const body = encodeURIComponent(
      [
        'Hello GramorX team,',
        '',
        `I have just sent ${fmtUsd(amountCents)} for ${planLabel} (${cycleLabel}).`,
        intentId ? `Payment intent: ${intentId}` : '',
        referralCode ? `Referral code: ${referralCode}` : '',
        promoCode ? `Promo code: ${promoCode}` : '',
        '',
        'Transaction hash / reference:',
        'Wallet address used:',
        '',
        'Thanks!',
      ]
        .filter(Boolean)
        .join('%0D%0A'),
    );
    return `mailto:billing@gramorx.com?subject=${subject}&body=${body}`;
  }, [amountCents, planLabel, cycleLabel, intentId, referralCode, promoCode]);

  return (
    <>
      <Head>
        <title>Crypto payment instructions — GramorX</title>
      </Head>
      <main className="min-h-screen bg-background text-foreground antialiased">
        <div className="py-16">
          <Container>
            <header className="mx-auto mb-8 max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-caption text-muted-foreground">
                <i className="fas fa-coins text-caption" aria-hidden="true"></i>
                Manual crypto checkout
              </p>
              <h1 className="mt-4 text-balance text-h1">
                <span className="text-gradient-primary">Complete your crypto payment</span>
              </h1>
              <p className="mt-3 text-body text-muted-foreground">
                Send the exact amount to one of the wallets below, then share your transaction proof so our billing team can
                activate your subscription.
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="card-surface rounded-ds-2xl p-6 lg:col-span-2 space-y-6">
                <section>
                  <h2 className="text-h3">Payment summary</h2>
                  <dl className="mt-4 grid gap-3 text-body">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Plan</dt>
                      <dd className="font-medium text-foreground">{planLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Billing</dt>
                      <dd className="font-medium text-foreground">{cycleLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Amount due</dt>
                      <dd className="text-h4 font-semibold">{fmtUsd(amountCents)}</dd>
                    </div>
                    {promoCode ? (
                      <div className="flex items-center justify-between text-success">
                        <dt className="text-muted-foreground">Promo applied</dt>
                        <dd className="font-medium">{promoCode}</dd>
                      </div>
                    ) : null}
                    {referralCode ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Referral code</dt>
                        <dd className="font-medium">{referralCode}</dd>
                      </div>
                    ) : null}
                    {intentId ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Intent reference</dt>
                        <dd className="font-medium font-mono">{intentId}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-4 text-small text-muted-foreground">
                    Keep this page open until you finish the transfer. Your order will be marked as pending until our team verifies the
                    blockchain confirmation, typically within 12 hours.
                  </p>
                </section>

                <section>
                  <h2 className="text-h3">Send to one of these wallets</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {CRYPTO_NETWORKS.map((entry) => (
                      <div key={entry.address} className="rounded-xl border border-border p-4">
                        <p className="text-caption text-muted-foreground">{entry.network}</p>
                        <p className="text-h4 font-semibold">{entry.name}</p>
                        <code className="mt-3 block break-words rounded-lg bg-muted px-3 py-2 text-small">
                          {entry.address}
                        </code>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Only send {entry.name} on {entry.network}. Transfers on other networks may be lost.
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-h3">After you send the payment</h2>
                  <ol className="mt-4 space-y-3 text-body">
                    <li className="flex gap-3">
                      <span className="mt-1 h-6 w-6 flex-none rounded-full bg-primary/10 text-center text-small font-medium text-primary">
                        1
                      </span>
                      <span>Copy the transaction hash or screenshot the confirmation from your wallet or exchange.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 h-6 w-6 flex-none rounded-full bg-primary/10 text-center text-small font-medium text-primary">
                        2
                      </span>
                      <span>
                        Email the proof to <a href={supportMailHref}>billing@gramorx.com</a> so we can verify it faster.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 h-6 w-6 flex-none rounded-full bg-primary/10 text-center text-small font-medium text-primary">
                        3
                      </span>
                      <span>
                        Our billing specialists will activate your account once the transfer confirms (usually within 12 hours). You will
                        receive an email receipt when it is done.
                      </span>
                    </li>
                  </ol>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button asChild size="lg">
                      <a href={supportMailHref}>Email payment proof</a>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/checkout">Return to checkout</Link>
                    </Button>
                    <Link href="/help" className="text-small text-muted-foreground underline-offset-4 hover:underline">
                      Need help? Contact support
                    </Link>
                  </div>
                </section>
              </Card>

              <aside className="space-y-4">
                <Card className="card-surface rounded-ds-2xl p-6 space-y-4">
                  <h2 className="text-h3">Helpful tips</h2>
                  <ul className="space-y-3 text-small text-muted-foreground">
                    <li className="flex gap-2">
                      <i className="fas fa-check text-primary" aria-hidden="true"></i>
                      Double-check network fees so the received amount matches {fmtUsd(amountCents)}.
                    </li>
                    <li className="flex gap-2">
                      <i className="fas fa-lock text-primary" aria-hidden="true"></i>
                      Only use the addresses listed here. We never share wallet details via direct messages.
                    </li>
                    <li className="flex gap-2">
                      <i className="fas fa-bolt text-primary" aria-hidden="true"></i>
                      Want an instant activation? Consider switching to card payments on the <Link href="/checkout">checkout page</Link>.
                    </li>
                  </ul>
                </Card>

                <Card className="card-surface rounded-ds-2xl p-6">
                  <h2 className="text-h4">Track your order</h2>
                  <p className="mt-2 text-small text-muted-foreground">
                    We will email you at your GramorX login address as soon as the crypto transfer confirms. You can also monitor your
                    subscription status from <Link href="/account/billing">Account → Billing</Link>.
                  </p>
                </Card>
              </aside>
            </div>
          </Container>
        </div>
      </main>
    </>
  );
};

export default CryptoCheckoutPage;
