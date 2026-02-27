import { useRouter } from 'next/router';
import { Button, Card } from '@/components/design-system';
import { useState } from 'react';

export default function ConfirmOrder() {
  const router = useRouter();
  const { plan } = router.query;
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const res = await fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const { checkoutUrl } = await res.json();
    router.push(checkoutUrl);
  };

  return (
    <div className="container py-10">
      <Card className="p-8 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Confirm Your Order</h1>
        <p className="mb-2">Plan: <strong>{plan}</strong></p>
        <p className="mb-2">Price: <strong>$19.99 / month</strong></p>
        <p className="text-sm text-gray-400 mb-6">
          You will be redirected to Safepay to complete payment securely.
        </p>
        <Button onClick={handleConfirm} disabled={loading}>
          {loading ? 'Processing...' : 'Confirm & Pay'}
        </Button>
      </Card>
    </div>
  );
}
