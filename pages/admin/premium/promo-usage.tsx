// pages/admin/premium/promo-usage.tsx
import * as React from 'react';
import Link from 'next/link';

import type { Cycle, PlanKey } from '@/types/payments';
import type { PaymentProvider } from '@/lib/payments/gateway';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  crypto: 'Crypto',
};

const PLAN_LABEL: Record<PlanKey, string> = {
  starter: 'Starter',
  booster: 'Booster',
  master: 'Master',
};

const CYCLE_LABEL: Record<Cycle, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
};

type PromoUsageRow = Readonly<{
  intentId: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  promoCode: string;
  referralCode: string | null;
  plan: PlanKey;
  cycle: Cycle;
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  manual: boolean;
}>;

type ApiResponse =
  | { ok: true; data: PromoUsageRow[] }
  | { ok: false; error: string };

async function getToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
}

const formatCurrency = (amountCents: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amountCents / 100);
  } catch {
    return `${currency || 'USD'} ${(amountCents / 100).toFixed(2)}`;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function AdminPromoUsagePage() {
  const [rows, setRows] = React.useState<PromoUsageRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [lastRefreshed, setLastRefreshed] = React.useState<string | null>(null);

  const fetchUsage = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('You must be signed in as an admin.');
        return;
      }
      const res = await fetch('/api/admin/premium/promo-usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: ApiResponse = await res.json();
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? 'Failed to load promo usage');
      }
      setRows(payload.data);
      setLastRefreshed(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load promo usage');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      return (
        row.promoCode.toLowerCase().includes(q) ||
        (row.userEmail ?? '').toLowerCase().includes(q) ||
        (row.userName ?? '').toLowerCase().includes(q) ||
        (row.referralCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const stats = React.useMemo(() => {
    const uniqueUsers = new Set(filtered.map((row) => row.userId ?? row.intentId)).size;
    const manualCount = filtered.filter((row) => row.manual).length;
    const totalFaceValue = filtered.reduce((sum, row) => sum + row.amountCents, 0);
    return {
      uniqueUsers,
      manualCount,
      totalFaceValue,
    };
  }, [filtered]);

  return (
    <main className="pr-min-h-[100dvh] pr-bg-slate-950 pr-text-white pr-p-4">
      <div className="pr-mx-auto pr-max-w-6xl pr-space-y-6">
        <header className="pr-flex pr-flex-col gap-2 sm:pr-flex-row sm:pr-items-center sm:pr-justify-between">
          <div>
            <h1 className="pr-text-h3 pr-font-semibold">Admin · Promo usage</h1>
            <p className="pr-text-small pr-text-white/70">
              Track who redeemed admin-issued promo codes across checkout flows.
            </p>
          </div>
          <div className="pr-flex pr-gap-3 pr-flex-wrap">
            <Link href="/admin/premium/promo-codes" className="pr-text-small pr-text-white/70 pr-underline">
              Manage promo codes
            </Link>
            <Link href="/admin" className="pr-text-small pr-text-white/70 pr-underline">
              Back to Admin
            </Link>
          </div>
        </header>

        <section className="pr-rounded-2xl pr-border pr-border-white/10 pr-bg-white/5 pr-backdrop-blur pr-p-6">
          <div className="pr-flex pr-flex-col pr-gap-4 lg:pr-flex-row lg:pr-items-end lg:pr-justify-between">
            <div className="pr-grid pr-gap-3 pr-text-small sm:pr-grid-cols-3">
              <div>
                <p className="pr-text-white/60">Redemptions</p>
                <p className="pr-text-h4 pr-font-semibold">{filtered.length}</p>
              </div>
              <div>
                <p className="pr-text-white/60">Unique users</p>
                <p className="pr-text-h4 pr-font-semibold">{stats.uniqueUsers}</p>
              </div>
              <div>
                <p className="pr-text-white/60">Manual fulfilments</p>
                <p className="pr-text-h4 pr-font-semibold">{stats.manualCount}</p>
              </div>
            </div>
            <div className="pr-flex pr-flex-col pr-items-start pr-gap-2 sm:pr-flex-row sm:pr-items-center">
              <label className="pr-flex pr-items-center pr-gap-2">
                <span className="pr-text-small pr-text-white/70">Search</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Code, email, referral…"
                  className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2 pr-text-small"
                />
              </label>
              <button
                type="button"
                onClick={() => void fetchUsage()}
                disabled={loading}
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2 pr-text-small disabled:pr-opacity-60"
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
          <p className="pr-mt-3 pr-text-caption pr-text-white/60">
            Total face value booked: {formatCurrency(stats.totalFaceValue, filtered[0]?.currency ?? 'USD')}
            {lastRefreshed ? ` · Updated ${formatDate(lastRefreshed)}` : ''}
          </p>
        </section>

        <section className="pr-rounded-2xl pr-border pr-border-white/10 pr-bg-white/5 pr-backdrop-blur pr-p-6">
          <div className="pr-overflow-x-auto">
            <table className="pr-min-w-full pr-text-left pr-text-small">
              <thead className="pr-text-white/70">
                <tr className="pr-border-b pr-border-white/10">
                  <th className="pr-py-2 pr-pr-4">Promo</th>
                  <th className="pr-py-2 pr-pr-4">User</th>
                  <th className="pr-py-2 pr-pr-4">Plan</th>
                  <th className="pr-py-2 pr-pr-4">Provider</th>
                  <th className="pr-py-2 pr-pr-4">Amount</th>
                  <th className="pr-py-2 pr-pr-4">Status</th>
                  <th className="pr-py-2 pr-pr-4">Referral</th>
                  <th className="pr-py-2 pr-pr-4">Created</th>
                  <th className="pr-py-2 pr-pr-4">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="pr-py-3 pr-text-white/60">
                      {loading ? 'Loading promo usage…' : 'No promo redemptions yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.intentId} className="pr-border-b pr-border-white/5 last:pr-border-none">
                      <td className="pr-py-2 pr-pr-4 pr-font-mono">
                        <div className="pr-flex pr-items-center pr-gap-2">
                          <span>{row.promoCode}</span>
                          {row.manual ? (
                            <span className="pr-rounded pr-bg-white/20 pr-px-2 pr-py-0.5 pr-text-caption">Manual</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="pr-py-2 pr-pr-4">
                        <div>{row.userName ?? '—'}</div>
                        <div className="pr-text-caption pr-text-white/60">{row.userEmail ?? row.userId ?? '—'}</div>
                      </td>
                      <td className="pr-py-2 pr-pr-4">
                        {PLAN_LABEL[row.plan]} · {CYCLE_LABEL[row.cycle]}
                      </td>
                      <td className="pr-py-2 pr-pr-4">{PROVIDER_LABEL[row.provider]}</td>
                      <td className="pr-py-2 pr-pr-4">{formatCurrency(row.amountCents, row.currency)}</td>
                      <td className="pr-py-2 pr-pr-4 pr-capitalize">{row.status}</td>
                      <td className="pr-py-2 pr-pr-4">{row.referralCode ?? '—'}</td>
                      <td className="pr-py-2 pr-pr-4">{formatDate(row.createdAt)}</td>
                      <td className="pr-py-2 pr-pr-4">{formatDate(row.confirmedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {error ? <p className="pr-mt-4 pr-text-small pr-text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
