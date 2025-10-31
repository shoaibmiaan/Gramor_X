// pages/checkout/save-card.tsx
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function SaveCardForm() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [name, setName] = React.useState('');
  const [line1, setLine1] = React.useState('');
  const [city, setCity] = React.useState('');
  const [postal, setPostal] = React.useState('');
  const [country, setCountry] = React.useState('PK');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const plan = (router.query.plan as string) ?? 'starter';
  const cycle = (router.query.cycle as string) ?? 'monthly';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!stripe || !elements) return;

    setLoading(true);

    const pmRes = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement)!,
      billing_details: {
        name: name || undefined,
        phone: phone || undefined,
        address: {
          line1: line1 || undefined,
          city: city || undefined,
          postal_code: postal || undefined,
          country: country || undefined,
        },
      },
    });

    if (pmRes.error) {
      setLoading(false);
      setMsg(pmRes.error.message || 'Card error');
      return;
    }

    const r = await fetch('/api/payments/vault', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        payment_method_id: pmRes.paymentMethod!.id,
        plan,
        cycle,
        billing_details: {
          name,
          phone,
          address: { line1, city, postal_code: postal, country },
        },
      }),
    });

    const j = await r.json();
    setLoading(false);

    if (!r.ok) {
      setMsg(j?.error || j?.details || 'Vault failed');
      return;
    }

    router.replace({ pathname: '/account/billing', query: { due: '1', vaulted: '1' } });
  }

  return (
    <>
      <Head>
        <title>Enter card · GramorX</title>
        <meta name="description" content="Securely save a card to activate your membership." />
      </Head>

      <div className="py-8">
        <Container className="max-w-3xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-h2 font-semibold text-foreground">Enter card details</h1>
            <p className="text-small text-muted-foreground">
              Your plan will be activated, and the amount recorded as due. We’ll notify you before charging later.
            </p>
          </header>

          <Card as="section" padding="lg" insetBorder>
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-small text-muted-foreground">
                  Name on card
                </label>
                <input
                  id="name"
                  className="input"
                  autoComplete="cc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Billing address */}
              <div className="space-y-2">
                <label className="text-small text-muted-foreground">Billing address</label>
                <input
                  className="input"
                  placeholder="Address line 1"
                  autoComplete="address-line1"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    placeholder="City"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Postal code"
                    autoComplete="postal-code"
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                  />
                </div>
                <input
                  className="input"
                  placeholder="Country code (e.g., PK, US)"
                  autoComplete="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                />
                <input
                  className="input"
                  placeholder="Phone (optional)"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Card element */}
              <div className="space-y-2">
                <label htmlFor="card" className="text-small text-muted-foreground">
                  Card
                </label>
                <div
                  id="card"
                  className="rounded-ds-xl border border-border/60 bg-background px-3 py-3"
                >
                  {/* CardElement renders inside an iframe; DS styling is applied to the wrapper */}
                  <CardElement options={{ hidePostalCode: true }} />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={loading || !stripe}
                disabled={loading || !stripe}
              >
                {loading ? 'Saving…' : 'Save card & activate membership'}
              </Button>

              <p className="text-caption text-muted-foreground">
                By continuing you agree we may charge this saved card later to settle your due. You’ll be notified first.
              </p>

              {msg && (
                <Alert variant="error" appearance="soft" className="mt-2">
                  {msg}
                </Alert>
              )}

              <div className="pt-1">
                <Button asChild variant="link" size="sm">
                  <Link href="/account/billing">Back to billing</Link>
                </Button>
              </div>
            </form>
          </Card>
        </Container>
      </div>
    </>
  );
}

export default function SaveCardPage() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="py-8">
        <Container className="max-w-3xl">
          <Alert variant="warning" appearance="soft" title="Card payments unavailable">
            Add <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to show the secure card form.
          </Alert>
          <div className="mt-4">
            <Button asChild variant="link" size="sm">
              <Link href="/account/billing">Back to billing</Link>
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <SaveCardForm />
    </Elements>
  );
}
