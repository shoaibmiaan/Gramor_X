// pages/admin/premium/promo-codes.tsx
import * as React from 'react';

import Link from 'next/link';

import type { PromoCodeRule } from '@/lib/promotions/codes';
import { normalizePromoCode } from '@/lib/promotions/codes';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { Cycle, PlanKey, PaymentMethod } from '@/types/payments';

const PLAN_VALUES: PlanKey[] = ['starter', 'booster', 'master'];
const CYCLE_VALUES: Cycle[] = ['monthly', 'annual'];
const METHOD_VALUES: PaymentMethod[] = ['stripe', 'easypaisa', 'jazzcash', 'safepay', 'crypto'];

type AdminPromoPayload = Readonly<{
  code: string;
  label: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  appliesTo?: Readonly<{
    plans?: PlanKey[];
    cycles?: Cycle[];
    methods?: PaymentMethod[];
  }>;
  stackableWithReferral?: boolean;
  notes?: string;
  isActive?: boolean;
}>;

async function getToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminPromoCodesPage() {
  const [existing, setExisting] = React.useState<PromoCodeRule[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    code: '',
    label: '',
    description: '',
    type: 'percent' as 'percent' | 'flat',
    value: 100,
    plans: '' as string,
    cycles: '' as string,
    methods: '' as string,
    stackable: false,
    notes: '',
    isActive: true,
  });

  const fetchExisting = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('You must be signed in as an admin.');
        return;
      }
      const res = await fetch('/api/admin/premium/promo-codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? 'Failed to load promo codes');
      }
      setExisting(payload.data as PromoCodeRule[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load promo codes');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchExisting();
  }, [fetchExisting]);

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseList = (input: string, allowed: readonly string[]): string[] => {
    return input
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => allowed.includes(part));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalized = normalizePromoCode(form.code);
    if (!normalized) {
      setError('Enter a valid promo code.');
      return;
    }

    const payload: AdminPromoPayload = {
      code: normalized,
      label: form.label.trim(),
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      stackableWithReferral: form.stackable,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };

    const plans = parseList(form.plans, PLAN_VALUES);
    const cycles = parseList(form.cycles, CYCLE_VALUES);
    const methods = parseList(form.methods, METHOD_VALUES);
    if (plans.length > 0 || cycles.length > 0 || methods.length > 0) {
      payload.appliesTo = {};
      if (plans.length > 0) payload.appliesTo.plans = plans as PlanKey[];
      if (cycles.length > 0) payload.appliesTo.cycles = cycles as Cycle[];
      if (methods.length > 0) payload.appliesTo.methods = methods as PaymentMethod[];
    }

    try {
      const token = await getToken();
      if (!token) {
        setError('You must be signed in as an admin.');
        return;
      }
      setLoading(true);
      const res = await fetch('/api/admin/premium/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const response = await res.json();
      if (!res.ok || !response?.ok) {
        throw new Error(response?.error ?? 'Failed to create promo code');
      }
      setSuccess(`Promo code ${response.data.code} created.`);
      setForm((prev) => ({
        ...prev,
        code: '',
        label: '',
        description: '',
        value: prev.type === 'percent' ? 100 : 0,
        plans: '',
        cycles: '',
        methods: '',
        notes: '',
      }));
      await fetchExisting();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create promo code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pr-min-h-[100dvh] pr-bg-slate-950 pr-text-white pr-p-4">
      <div className="pr-mx-auto pr-max-w-4xl pr-space-y-6">
        <header className="pr-flex pr-flex-col pr-gap-2 sm:pr-flex-row sm:pr-items-center sm:pr-justify-between">
          <h1 className="pr-text-h3 pr-font-semibold">Admin · Promo codes</h1>
          <div className="pr-flex pr-flex-wrap pr-gap-3 pr-justify-end">
            <Link href="/admin/premium/promo-usage" className="pr-text-small pr-text-white/70 pr-underline">
              View promo usage
            </Link>
            <Link href="/admin" className="pr-text-small pr-text-white/70 pr-underline">Back to Admin</Link>
          </div>
        </header>

        <section className="pr-rounded-2xl pr-border pr-border-white/10 pr-bg-white/5 pr-backdrop-blur pr-p-6">
          <h2 className="pr-text-h4 pr-font-semibold">Create a promo code</h2>
          <p className="pr-mt-1 pr-text-small pr-text-white/70">
            Generate fixed or percentage discounts (including 100% off) for special users. Codes are uppercase automatically.
          </p>
          <form className="pr-mt-4 pr-grid pr-gap-4 md:pr-grid-cols-2" onSubmit={handleSubmit}>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Code</span>
              <input
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2 pr-uppercase"
                value={form.code}
                onChange={handleChange('code')}
                placeholder="FREE100"
              />
            </label>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Label</span>
              <input
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.label}
                onChange={handleChange('label')}
                placeholder="100% scholarship"
              />
            </label>
            <label className="pr-col-span-2 pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Description</span>
              <textarea
                className="pr-min-h-[80px] pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.description}
                onChange={handleChange('description')}
                placeholder="Gift this user a full discount on the first billing cycle."
              />
            </label>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Discount type</span>
              <select
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as 'percent' | 'flat',
                    value: event.target.value === 'percent' ? Math.min(prev.value, 100) : prev.value,
                  }))
                }
              >
                <option value="percent">Percent off</option>
                <option value="flat">Flat amount (cents)</option>
              </select>
            </label>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">
                {form.type === 'percent' ? 'Percent value (0-100)' : 'Flat amount (USD cents)'}
              </span>
              <input
                type="number"
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.value}
                min={0}
                max={form.type === 'percent' ? 100 : undefined}
                onChange={handleChange('value')}
              />
            </label>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Limit to plans (comma separated)</span>
              <input
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.plans}
                onChange={handleChange('plans')}
                placeholder="starter, booster"
              />
            </label>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Limit to billing cycles</span>
              <input
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.cycles}
                onChange={handleChange('cycles')}
                placeholder="monthly, annual"
              />
            </label>
            <label className="pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Limit to payment methods</span>
              <input
                className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.methods}
                onChange={handleChange('methods')}
                placeholder="stripe, crypto"
              />
            </label>
            <label className="pr-flex pr-items-center pr-gap-2">
              <input type="checkbox" checked={form.stackable} onChange={handleChange('stackable')} />
              <span className="pr-text-small pr-text-white/80">Stackable with referral codes</span>
            </label>
            <label className="pr-flex pr-items-center pr-gap-2">
              <input type="checkbox" checked={form.isActive} onChange={handleChange('isActive')} />
              <span className="pr-text-small pr-text-white/80">Active immediately</span>
            </label>
            <label className="pr-col-span-2 pr-flex pr-flex-col pr-gap-1">
              <span className="pr-text-small pr-text-white/80">Internal notes (optional)</span>
              <textarea
                className="pr-min-h-[60px] pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-2"
                value={form.notes}
                onChange={handleChange('notes')}
                placeholder="Visible to admins only."
              />
            </label>
            <div className="pr-col-span-2 pr-flex pr-justify-end">
              <button
                type="submit"
                disabled={loading}
                className="pr-rounded-lg pr-bg-primary pr-px-4 pr-py-2 pr-text-small pr-font-medium disabled:pr-opacity-60"
              >
                {loading ? 'Saving…' : 'Create promo code'}
              </button>
            </div>
          </form>
          {error ? <p className="pr-mt-3 pr-text-small pr-text-red-300">{error}</p> : null}
          {success ? <p className="pr-mt-3 pr-text-small pr-text-emerald-300">{success}</p> : null}
          <p className="pr-mt-4 pr-text-caption pr-text-white/60">
            Plans: {PLAN_VALUES.join(', ')} · Cycles: {CYCLE_VALUES.join(', ')} · Methods: {METHOD_VALUES.join(', ')}
          </p>
        </section>

        <section className="pr-rounded-2xl pr-border pr-border-white/10 pr-bg-white/5 pr-backdrop-blur pr-p-6">
          <div className="pr-flex pr-items-center pr-justify-between pr-gap-3">
            <h2 className="pr-text-h4 pr-font-semibold">Existing promo codes</h2>
            <button
              type="button"
              onClick={() => void fetchExisting()}
              disabled={loading}
              className="pr-rounded-lg pr-border pr-border-white/20 pr-bg-white/10 pr-px-3 pr-py-1 pr-text-small disabled:pr-opacity-60"
            >
              Refresh
            </button>
          </div>
          <div className="pr-mt-4 pr-overflow-x-auto">
            <table className="pr-min-w-full pr-text-left pr-text-small">
              <thead className="pr-text-white/70">
                <tr className="pr-border-b pr-border-white/10">
                  <th className="pr-py-2 pr-pr-4">Code</th>
                  <th className="pr-py-2 pr-pr-4">Label</th>
                  <th className="pr-py-2 pr-pr-4">Type</th>
                  <th className="pr-py-2 pr-pr-4">Value</th>
                  <th className="pr-py-2 pr-pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {existing.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pr-py-3 pr-text-white/60">
                      {loading ? 'Loading…' : 'No promo codes yet.'}
                    </td>
                  </tr>
                ) : (
                  existing.map((promo) => (
                    <tr key={promo.code} className="pr-border-b pr-border-white/5 last:pr-border-none">
                      <td className="pr-py-2 pr-pr-4 pr-font-mono">{promo.code}</td>
                      <td className="pr-py-2 pr-pr-4">{promo.label}</td>
                      <td className="pr-py-2 pr-pr-4 capitalize">{promo.type}</td>
                      <td className="pr-py-2 pr-pr-4">
                        {promo.type === 'percent' ? `${promo.value}%` : `$${(promo.value / 100).toFixed(2)}`}
                      </td>
                      <td className="pr-py-2 pr-pr-4 pr-text-white/70">{promo.notes ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
