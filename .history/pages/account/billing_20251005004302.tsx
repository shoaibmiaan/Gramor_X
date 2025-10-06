// pages/account/billing.tsx
import * as React from 'react';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize } from 'cookie';

type Invoice = {
  id: string;
  amount: number;         // cents
  currency: string;       // e.g., 'USD'
  createdAt: string;      // ISO
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
};

type Summary = {
  plan: 'free' | 'starter' | 'booster' | 'master';
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | 'paused';
  renewsAt?: string;
  trialEndsAt?: string;
};

type Due = {
  id: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  status: 'due' | 'collected' | 'canceled';
  plan_key: 'starter' | 'booster' | 'master';
  cycle: 'monthly' | 'annual';
};

// -------- SSR guard: only redirects if there is NO session --------
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res, resolvedUrl } = ctx;

  // helper to append multiple Set-Cookie headers (Supabase may set several)
  const appendSetCookie = (cookie: string) => {
    const prev = res.getHeader('Set-Cookie');
    if (!prev) return res.setHeader('Set-Cookie', cookie);
    if (Array.isArray(prev)) return res.setHeader('Set-Cookie', [...prev, cookie]);
    return res.setHeader('Set-Cookie', [String(prev), cookie]);
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Next exposes parsed cookies here
          return (req as any).cookies?.[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          appendSetCookie(
            serialize(name, value, {
              ...options,
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production', // false on localhost (http)
            })
          );
        },
        remove(name: string, options: CookieOptions) {
          appendSetCookie(
            serialize(name, '', {
              ...options,
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              expires: new Date(0),
            })
          );
        },
      },
    }
  );

  // Touch auth so Supabase can refresh and write cookies if needed
  const { data, error } = await supabase.auth.getUser();

  if (!data?.user) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  return { props: {} };
};

// ------------------- Client component (unchanged logic) -------------------
export default function BillingPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [dues, setDues] = React.useState<Due[]>([]);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [portalAvailable, setPortalAvailable] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch('/api/billing/summary', { credentials: 'include' });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Failed to load subscription');
        setSummary(j.summary as Summary);
        setInvoices((j.invoices || []) as Invoice[]);
        setDues((j.dues || []) as Due[]);
        setPortalAvailable(!j.needsStripeSetup);
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
      const r = await fetch('/api/billing/portal', { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'Failed to open portal');
      window.location.href = j.url as string;
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

      {loading && <div className="rounded-2xl p-4 ring-1 ring-inset">Loading billing…</div>}

      {!loading && error && (
        <div className="rounded-2xl p-4 ring-1 ring-inset">
          <div className="font-medium">Couldn’t load billing</div>
          <div className="text-sm opacity-70">{error}</div>
          <div className="mt-3">
            <Link className="underline" href="/pricing">
              Go to Pricing
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Current plan */}
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

              {portalAvailable ? (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="rounded-xl px-4 py-2 ring-1 ring-inset"
                  aria-busy={portalLoading}
                >
                  {portalLoading ? 'Opening…' : 'Change plan'}
                </button>
              ) : (
                <Link href="/pricing" className="rounded-xl px-4 py-2 ring-1 ring-inset">
                  Change plan
                </Link>
              )}
            </div>

            {!portalAvailable && (
              <p className="mt-3 text-sm opacity-70">
                Payments are temporarily unavailable. If you recently subscribed,
                your card was <span className="font-medium">not charged</span> and the
                amount is marked as <span className="font-medium">due</span>. We’ll notify
                you before retrying payment.
              </p>
            )}
          </section>

          {/* Pending dues (manual fallback) */}
          {dues.length > 0 && (
            <section className="mb-6 rounded-2xl p-4 ring-1 ring-inset">
              <h2 className="mb-2 text-lg font-semibold">Pending dues</h2>
              <ul className="space-y-2">
                {dues.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl p-3 ring-1 ring-inset"
                  >
                    <div>
                      <div className="font-medium capitalize">
                        {d.plan_key} · {d.cycle}
                      </div>
                      <div className="text-sm opacity-70">
                        {new Date(d.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {d.currency} {(d.amount_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs opacity-70">Not charged yet</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm opacity-70">
                Due to a temporary technical issue, your card has not been charged. We’ll
                notify you before retrying payment.
              </p>
            </section>
          )}

          {/* Invoices */}
          <section className="rounded-2xl p-4 ring-1 ring-inset">
            <h2 className="mb-3 text-lg font-semibold">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm opacity-70">No invoices yet.</p>
            ) : (
              <ul className="space-y-2">
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl p-3 ring-1 ring-inset"
                  >
                    <div>
                      <div className="font-medium">{inv.status.toUpperCase()}</div>
                      <div className="text-sm opacity-70">
                        {new Date(inv.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {inv.currency} {(inv.amount / 100).toFixed(2)}
                      </div>
                      {inv.hostedInvoiceUrl ? (
                        <a
                          className="text-sm underline"
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
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
