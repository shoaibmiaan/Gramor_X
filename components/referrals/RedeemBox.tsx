// components/referrals/RedeemBox.tsx
import * as React from 'react';

import { redeemReferral } from '@/lib/api/referrals';
import { normalizeCode } from '@/lib/referrals/credit-rules';

export type RedeemSuccessPayload = Readonly<{
  code: string;
  rewardCredits: number;
}>;

type Props = {
  onSuccess?: (payload: RedeemSuccessPayload) => void;
  className?: string;
  initialCode?: string;
};

export default function RedeemBox({ onSuccess, className = '', initialCode }: Props) {
  const [code, setCode] = React.useState(() => (initialCode ? normalizeCode(initialCode) : ''));
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof initialCode === 'string' && initialCode.length > 0) {
      setCode(normalizeCode(initialCode));
    }
  }, [initialCode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeCode(code);
    if (!normalized || normalized.length < 6) {
      setErr('Enter a valid referral code');
      return;
    }
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await redeemReferral({ code: normalized, context: 'checkout' });
      if ('ok' in res && res.ok) {
        setMsg(`Referral ${normalized} applied! You received ${res.awarded} credits.`);
        setCode(normalized);
        onSuccess?.({ code: normalized, rewardCredits: res.awarded });
      } else {
        setErr((res as any).error || 'Invalid code');
      }
    } catch (error) {
      setErr((error as Error)?.message || 'Could not apply referral code');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className={`rounded-xl border border-border p-3 ${className}`}>
      <label htmlFor="ref-code" className="mb-1 block text-small font-medium">Have a referral code?</label>
      <div className="flex items-center gap-2">
        <input
          id="ref-code"
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value))}
          placeholder="Enter code (e.g., 9XH2LQ7B)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-small outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length < 6}
          className="rounded-lg bg-primary px-4 py-2 text-small text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Applying…' : 'Apply'}
        </button>
      </div>

      {msg ? <p className="mt-2 text-small text-success dark:text-emerald-400">{msg}</p> : null}
      {err ? <p className="mt-2 text-small text-destructive">{err}</p> : null}
    </form>
  );
}
