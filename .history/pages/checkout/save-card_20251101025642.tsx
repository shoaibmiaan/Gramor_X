// pages/checkout/save-card.tsx
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function SaveCardForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setMsg(null);

    // Option A: create a PaymentMethod and send it to server to attach
    const pm = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement)!,
    });
    if (pm.error) {
      setMsg(pm.error.message || 'Card error');
      setLoading(false);
      return;
    }

    // Send PM id to your server to create a vault entry (server will create customer & attach)
    const r = await fetch('/api/payments/vault', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payment_method_id: pm.paymentMethod!.id }),
    });
    const j = await r.json();
    setLoading(false);

    if (!r.ok) {
      setMsg(j?.error || 'vault failed');
      return;
    }

    // Server returns masked card metadata and a friendly message
    setMsg('Card saved — membership activated (payment pending). You will be notified.');
    // redirect to billing or show an invoice
    window.location.href = '/account/billing?due=1';
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button disabled={!stripe || loading} style={{ marginTop: 12 }}>
        {loading ? 'Saving…' : 'Save card & activate membership'}
      </button>
      {msg && <p>{msg}</p>}
    </form>
  );
}

export default function SaveCardPage() {
  return (
    <Elements stripe={stripePromise}>
      <SaveCardForm />
    </Elements>
  );
}
