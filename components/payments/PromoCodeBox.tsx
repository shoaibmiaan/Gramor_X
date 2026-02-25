import * as React from 'react';

import {
  checkPromoEligibility,
  computePromoDiscount,
  explainPromoRule,
  findPromoByCode,
  normalizePromoCode,
  type PromoCodeRule,
} from '@/lib/promotions/codes';
import { fetchPromoByCode } from '@/lib/promotions/client';
import type { Cycle, PlanKey } from '@/types/payments';

export type PromoCodeApplyPayload = Readonly<{
  rule: PromoCodeRule;
  discountCents: number;
}>;

type Props = {
  plan?: PlanKey;
  cycle?: Cycle;
  amountCents: number;
  onApply: (payload: PromoCodeApplyPayload) => void;
  onClear: () => void;
  className?: string;
  applied?: PromoCodeRule | null;
  initialCode?: string;
};

export default function PromoCodeBox({
  plan,
  cycle = 'monthly',
  amountCents,
  onApply,
  onClear,
  className = '',
  applied,
  initialCode,
}: Props) {
  const [code, setCode] = React.useState(() => normalizePromoCode(initialCode ?? applied?.code ?? ''));
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCode(normalizePromoCode(applied?.code ?? initialCode ?? code));
    if (!applied) {
      setMessage(null);
    } else {
      const discount = computePromoDiscount(applied, amountCents);
      setMessage(`Promo ${applied.code} applied — saving ${formatCurrency(discount)}.`);
    }
  }, [applied, amountCents, initialCode]);

  const disabled = !plan || amountCents <= 0;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) {
      setError('Select a plan first to use a promo code.');
      return;
    }
    const normalized = normalizePromoCode(code);
    if (!normalized) {
      setError('Enter a promo code to apply.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    let rule = findPromoByCode(normalized);
    if (!rule) {
      rule = await fetchPromoByCode(normalized);
    }
    if (!rule) {
      setError('Unknown promo code. Double-check the spelling or contact support.');
      setBusy(false);
      return;
    }

    const eligibility = checkPromoEligibility(rule, { plan, cycle });
    if (!eligibility.ok) {
      setError(eligibility.reason);
      setBusy(false);
      return;
    }

    const discount = computePromoDiscount(rule, amountCents);
    if (discount <= 0) {
      setError('Promo applies to larger totals. Try annual billing or a higher plan.');
      setBusy(false);
      return;
    }

    onApply({ rule, discountCents: discount });
    setMessage(`Promo ${rule.code} applied — saving ${formatCurrency(discount)}.`);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className={`rounded-xl border border-border p-3 ${className}`}>
      <label htmlFor="promo-code" className="mb-1 block text-small font-medium">
        Have a promo code?
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="promo-code"
          value={code}
          onChange={(event) => {
            setCode(normalizePromoCode(event.target.value));
            setError(null);
          }}
          placeholder="Enter code (e.g., PROMO10)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-small outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || disabled || code.trim().length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-small text-primary-foreground disabled:opacity-60"
          >
            {busy ? 'Checking…' : 'Apply'}
          </button>
          {applied ? (
            <button
              type="button"
              onClick={() => {
                setCode('');
                setMessage(null);
                setError(null);
                onClear();
              }}
              className="rounded-lg border border-border px-3 py-2 text-small text-muted-foreground hover:bg-muted"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {applied ? (
        <p className="mt-2 text-small text-success dark:text-emerald-400">
          {message ?? explainPromoRule(applied)}
        </p>
      ) : message ? (
        <p className="mt-2 text-small text-success dark:text-emerald-400">{message}</p>
      ) : (
        <p className="mt-2 text-small text-muted-foreground">
          Enter a valid promo code shared by GramorX support or listed on the promotions page.
        </p>
      )}
      {error ? <p className="mt-2 text-small text-destructive">{error}</p> : null}
    </form>
  );
}

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
};
