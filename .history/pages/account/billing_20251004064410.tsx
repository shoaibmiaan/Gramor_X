// pages/account/billing.tsx
import * as React from 'react';
import Link from 'next/link';

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
};

type Summary = {
  plan: 'free' | 'starter' | 'booster' | 'master';
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | 'paused';
  renewsAt?: string;
  trialEndsAt?: string;
};

export default function BillingPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [portalLoading, setPortalLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch('/api/billing/summary');
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Failed to load subscription');
        setSummary(j.summary);
        setInvoices(j.invoices || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openPortal() {
    try {
      setPortalLoading(true);
      const r = await fetch('/api/billing/portal', { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'Failed to open portal');
      window.location.href = j.url;
    } catch (e) {
      setError((e as Error).message);
      setPortalLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="opacity-70">Manage your plan and invoices.</p>
      </header>

      {loading && (
        <div className="rounded-2xl p-4 ring-1 ring-inset">
          Loading billing…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl p-4 ring-1 ring-inset">
          <div className="font-medium">Couldn’t load billing</div>
          <div className="opacity-70 text-sm">{error}</div>
          <div className="mt-3">
            <Link className="underline" href="/pricing">Go to Pricing</Link>
          </div>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <section className="mb-6 rounded-2xl p-4 ring-1 ring-inset">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Current plan</div>
                <div className="text-lg font-semibold capitalize">{summary.plan}</div>
                <div className="text-sm opacity-70">
                  Status: {summary.status}
                  {summary.renewsAt && <> · Renews {new Date(summary.renewsAt).toLocaleDateString()}</>}
                  {summary.trialEndsAt && <> · Trial ends {new Date(summary.trialEndsAt).toLocaleDateString()}</>}
                </div>
              </div>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="rounded-xl px-4 py-2 ring-1 ring-inset"
                aria-busy={portalLoading}
              >
                {portalLoading ? 'Opening…' : 'Change plan'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl p-4 ring-1 ring-inset">
            <h2 className="mb-3 text-lg font-semibold">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm opacity-70">No invoices yet.</p>
            ) : (
              <ul className="space-y-2">
                {invoices.map(inv => (
                  <li key={inv.id} className="flex items-center justify-between rounded-xl p-3 ring-1 ring-inset">
                    <div>
                      <div className="font-medium">{inv.status.toUpperCase()}</div>
                      <div className="text-sm opacity-70">{new Date(inv.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {inv.currency} {(inv.amount / 100).toFixed(2)}
                      </div>
                      {inv.hostedInvoiceUrl ? (
                        // External link to Stripe-hosted invoice is OK
                        <a className="text-sm underline" href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                          View invoice
                        </a>
                      ) : (
                        <span className="text-sm opacity-70">No PDF</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
