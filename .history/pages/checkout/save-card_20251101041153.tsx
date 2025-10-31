// pages/checkout/save-card.tsx
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function FormInner() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // plan/cycle from query (fallbacks are safe)
  const plan = (router.query.plan as string) ?? 'starter';
  const cycle = (router.query.cycle as string) ?? 'monthly';

  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('PK'); // default for your audience
  const [phone, setPhone] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!stripe || !elements) return;
    setLoading(true);

    // 1) Create PaymentMethod in the browser (tokenizes card)
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

    // 2) Vault on server; also create pending intent linked to this vault
    const resp = await fetch('/api/payments/vault', {
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
    const json = await resp.json();
    setLoading(false);

    if (!resp.ok) {
      setMsg(json?.error || json?.details || 'Vault failed');
      return;
    }

    // 3) Success → back to Billing with flag
    router.replace({ pathname: '/account/billing', query: { due: '1', vaulted: '1' } });
  }

  const disabled = useMemo(() => !stripe || loading, [stripe, loading]);

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Enter card details</h1>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-sm">Name on card</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-sm">Billing address</label>
        <input className="input" placeholder="Address line 1" value={line1} onChange={(e)=>setLine1(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="City" value={city} onChange={(e)=>setCity(e.target.value)} />
          <input className="input" placeholder="Postal code" value={postal} onChange={(e)=>setPostal(e.target.value)} />
        </div>
        <input className="input" placeholder="Country code (e.g., PK, US)" value={country} onChange={(e)=>setCountry(e.target.value.toUpperCase())} maxLength={2} />
        <input className="input" placeholder="Phone (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
      </div>

      <div className="p-3 rounded-lg border">
        <CardElement options={{ hidePostalCode: true }} />
      </div>

      <button disabled={disabled} className="btn btn-primary w-full">
        {loading ? 'Saving…' : 'Save card & activate membership'}
      </button>

      {msg && <p className="text-red-600 text-sm">{msg}</p>}

      <p className="text-sm text-gray-500">
        By continuing you agree that we may charge this saved card later to settle your due. You’ll be notified first.
      </p>

      <p className="text-sm">
        <Link href="/account/billing">Back to billing</Link>
      </p>
    </form>
  );
}

export default function SaveCardPage() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Card payments unavailable</h1>
        <p>Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to show the secure card form.</p>
        <p className="mt-4"><Link href="/account/billing">Back to billing</Link></p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <FormInner />
    </Elements>
  );
}
// pages/checkout/save-card.tsx
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function FormInner() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // plan/cycle from query (fallbacks are safe)
  const plan = (router.query.plan as string) ?? 'starter';
  const cycle = (router.query.cycle as string) ?? 'monthly';

  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('PK'); // default for your audience
  const [phone, setPhone] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!stripe || !elements) return;
    setLoading(true);

    // 1) Create PaymentMethod in the browser (tokenizes card)
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

    // 2) Vault on server; also create pending intent linked to this vault
    const resp = await fetch('/api/payments/vault', {
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
    const json = await resp.json();
    setLoading(false);

    if (!resp.ok) {
      setMsg(json?.error || json?.details || 'Vault failed');
      return;
    }

    // 3) Success → back to Billing with flag
    router.replace({ pathname: '/account/billing', query: { due: '1', vaulted: '1' } });
  }

  const disabled = useMemo(() => !stripe || loading, [stripe, loading]);

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Enter card details</h1>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-sm">Name on card</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-sm">Billing address</label>
        <input className="input" placeholder="Address line 1" value={line1} onChange={(e)=>setLine1(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="City" value={city} onChange={(e)=>setCity(e.target.value)} />
          <input className="input" placeholder="Postal code" value={postal} onChange={(e)=>setPostal(e.target.value)} />
        </div>
        <input className="input" placeholder="Country code (e.g., PK, US)" value={country} onChange={(e)=>setCountry(e.target.value.toUpperCase())} maxLength={2} />
        <input className="input" placeholder="Phone (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
      </div>

      <div className="p-3 rounded-lg border">
        <CardElement options={{ hidePostalCode: true }} />
      </div>

      <button disabled={disabled} className="btn btn-primary w-full">
        {loading ? 'Saving…' : 'Save card & activate membership'}
      </button>

      {msg && <p className="text-red-600 text-sm">{msg}</p>}

      <p className="text-sm text-gray-500">
        By continuing you agree that we may charge this saved card later to settle your due. You’ll be notified first.
      </p>

      <p className="text-sm">
        <Link href="/account/billing">Back to billing</Link>
      </p>
    </form>
  );
}

export default function SaveCardPage() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Card payments unavailable</h1>
        <p>Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to show the secure card form.</p>
        <p className="mt-4"><Link href="/account/billing">Back to billing</Link></p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <FormInner />
    </Elements>
  );
}
