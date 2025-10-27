import * as React from 'react';

import { createReferralCode, getReferralStats } from '@/lib/api/referrals';
import { track } from '@/lib/analytics/track';
import type { ReferralSummary } from '@/types/referrals';

export type ReferralCardProps = {
  className?: string;
  source?: string;
  onCodeGenerated?: (code: string) => void;
  onShare?: (mode: 'copy' | 'share' | 'error') => void;
};

function buildShareUrl(code?: string | null): string {
  if (!code) return '';
  if (typeof window === 'undefined') return `https://gramorx.com/pricing?code=${encodeURIComponent(code)}`;
  const origin = window.location.origin;
  return `${origin}/pricing?code=${encodeURIComponent(code)}`;
}

export default function ReferralCard({ className = '', source, onCodeGenerated, onShare }: ReferralCardProps) {
  const [summary, setSummary] = React.useState<ReferralSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReferralStats();
      if (!('ok' in res) || !res.ok) throw new Error((res as any)?.error || 'Failed to load referrals');
      setSummary(res.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const shareUrl = React.useMemo(() => buildShareUrl(summary?.code ?? null), [summary?.code]);

  const copyLink = React.useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFlash('Referral link copied to clipboard');
      track('referral_link_created', { source: source ?? 'referral-card', method: 'copy' });
      onShare?.('copy');
    } catch {
      setFlash('Unable to copy automatically. Copy the link manually.');
      onShare?.('error');
    }
  }, [onShare, shareUrl, source]);

  const handleShare = React.useCallback(async () => {
    if (!shareUrl) return;
    const message = `Join me on GramorX and unlock premium credits: ${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: message, title: 'Join me on GramorX' });
        track('referral_link_created', { source: source ?? 'referral-card', method: 'share' });
        onShare?.('share');
        return;
      } catch {
        /* fall back to new tab */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    track('referral_link_created', { source: source ?? 'referral-card', method: 'share' });
    onShare?.('share');
  }, [onShare, shareUrl, source]);

  const handleCreate = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await createReferralCode();
      if (!('ok' in res) || !res.ok) throw new Error((res as any)?.error || 'Could not create code');
      track('referral.code.create', { source: source ?? 'referral-card', code: res.code });
      onCodeGenerated?.(res.code);
      setSummary((prev) => ({
        code: res.code,
        balance: res.balance,
        lifetimeEarned: res.lifetimeEarned,
        totalReferrals: res.totalReferrals,
        approvedReferrals: prev?.approvedReferrals ?? 0,
        pendingReferrals: prev?.pendingReferrals ?? 0,
      }));
      setFlash('Referral code ready to share!');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [load, onCodeGenerated, source]);

  return (
    <section className={`rounded-2xl border border-border bg-background p-5 shadow-sm ${className}`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h4 font-semibold">Referral rewards</h2>
          <p className="text-small text-muted-foreground">Invite friends and earn credits for premium tools.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-small font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Generating…' : summary?.code ? 'Regenerate code' : 'Generate code'}
        </button>
      </header>

      {loading ? (
        <p className="text-small text-muted-foreground">Loading referral summary…</p>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-small">
          <p className="font-medium">Referral system unavailable</p>
          <p className="opacity-80">{error}</p>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {summary.code ? (
              <code className="rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-base tracking-[0.2em]">
                {summary.code}
              </code>
            ) : (
              <span className="text-small text-muted-foreground">Generate your unique referral code to start sharing.</span>
            )}

            {summary.code ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="rounded-lg border border-border px-3 py-1.5 text-small hover:bg-muted"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="rounded-lg border border-border px-3 py-1.5 text-small hover:bg-muted"
                >
                  Share
                </button>
              </div>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <dt className="text-caption uppercase tracking-wide text-muted-foreground">Available credits</dt>
              <dd className="text-h3 font-semibold">{summary.balance}</dd>
            </div>
            <div className="rounded-xl border border-border p-4">
              <dt className="text-caption uppercase tracking-wide text-muted-foreground">Lifetime earned</dt>
              <dd className="text-h3 font-semibold">{summary.lifetimeEarned}</dd>
            </div>
            <div className="rounded-xl border border-border p-4">
              <dt className="text-caption uppercase tracking-wide text-muted-foreground">Referrals</dt>
              <dd className="text-h3 font-semibold">
                {summary.approvedReferrals}
                <span className="ml-2 text-small text-muted-foreground">/{summary.totalReferrals}</span>
              </dd>
            </div>
          </dl>

          {shareUrl ? (
            <p className="rounded-lg border border-border/80 bg-muted/40 p-3 text-small text-muted-foreground">
              Share this link to send friends directly to pricing: <span className="font-medium">{shareUrl}</span>
            </p>
          ) : null}

          {flash ? (
            <p className="text-small text-primary">{flash}</p>
          ) : null}

          <ul className="list-disc space-y-1 pl-5 text-small text-muted-foreground">
            <li>Friends unlock credits instantly when they sign up with your code.</li>
            <li>Fraud checks limit one redemption per device to keep rewards fair.</li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
