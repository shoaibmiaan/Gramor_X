import * as React from 'react';

import { Button } from '@/components/design-system/Button';
import { Modal } from '@/components/design-system/Modal';
import { PLAN_LABEL, startCheckout } from '@/lib/payments/index';
import { track } from '@/lib/analytics/track';
import { evaluateQuota, nextPlanForQuota, type QuotaKey } from '@/lib/plan/quotas';
import type { PaymentMethod, PlanKey } from '@/types/payments';
import type { PlanId } from '@/types/pricing';

const DEFAULT_METHODS: PaymentMethod[] = ['stripe', 'crypto', 'easypaisa', 'jazzcash'];

export type UpgradeDialogProps = {
  open: boolean;
  onClose: () => void;
  plan: PlanId;
  quota: { key: QuotaKey; used: number };
  referralCode?: string;
  methods?: PaymentMethod[];
  source?: string;
  onCheckoutStart?: (provider: PaymentMethod) => void;
};

export function UpgradeDialog({
  open,
  onClose,
  plan,
  quota,
  referralCode,
  methods = DEFAULT_METHODS,
  source,
  onCheckoutStart,
}: UpgradeDialogProps) {
  const [loading, setLoading] = React.useState<PaymentMethod | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const evaluation = React.useMemo(() => evaluateQuota(plan, quota.key, quota.used), [plan, quota.key, quota.used]);
  const suggestedPlanId = React.useMemo(() => nextPlanForQuota(plan, quota.key), [plan, quota.key]);
  const canUpgrade = Boolean(suggestedPlanId);
  const targetPlan: PlanKey = (suggestedPlanId as PlanKey) ?? 'master';
  const targetLabel = PLAN_LABEL[targetPlan];

  const start = React.useCallback(
    async (provider: PaymentMethod) => {
      if (!canUpgrade) return;
      setLoading(provider);
      setError(null);
      const analyticsPayload = {
        source: source ?? 'upgrade-dialog',
        provider,
        plan: targetPlan,
        quota: quota.key,
      } as const;
      track('subscribe_clicked', analyticsPayload);
      track('payments.intent.create', analyticsPayload);
      onCheckoutStart?.(provider);
      try {
        const result = await startCheckout(provider, {
          plan: targetPlan,
          billingCycle: 'monthly',
          referralCode,
        });
        if (!result.ok) throw new Error(result.error || 'Checkout failed');
        if ('manual' in result && result.manual) {
          window.location.assign('/account/billing?due=1');
          return;
        }
        if ('url' in result && result.url) {
          window.location.assign(result.url);
          return;
        }
        throw new Error(`Unable to start ${provider} checkout.`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(null);
      }
    },
    [canUpgrade, onCheckoutStart, quota.key, referralCode, source, targetPlan],
  );

  const quotaName: Record<QuotaKey, string> = {
    dailyMocks: 'Daily mock tests',
    aiEvaluationsPerDay: 'AI evaluations per day',
    storageGB: 'Storage (GB)',
  };

  const helper = React.useMemo(() => {
    if (!canUpgrade) return 'You are already on the highest tier for this quota.';
    return `Upgrade to ${targetLabel} to unlock a higher limit.`;
  }, [canUpgrade, targetLabel]);

  return (
    <Modal open={open} onClose={onClose} title="Upgrade required" size="lg">
      <div className="space-y-5">
        <p className="text-small text-muted-foreground">
          You have reached the limit for <span className="font-medium">{quotaName[quota.key]}</span> on your current plan.
        </p>

        <div className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-caption uppercase tracking-wide text-muted-foreground">Current usage</p>
              <p className="text-h3 font-semibold">
                {evaluation.used} / {evaluation.isUnlimited ? '∞' : evaluation.limit}
              </p>
            </div>
            {evaluation.remaining > 0 ? (
              <p className="rounded-full bg-muted px-3 py-1 text-small text-muted-foreground">
                {evaluation.remaining} remaining today
              </p>
            ) : (
              <p className="rounded-full bg-destructive/10 px-3 py-1 text-small text-destructive">Limit reached</p>
            )}
          </div>
        </div>

        <p className="text-small text-muted-foreground">{helper}</p>

        {canUpgrade ? (
          <div className="grid gap-3 md:grid-cols-3">
            {methods.map((method) => (
              <Button
                key={method}
                variant="solid"
                size="lg"
                disabled={loading !== null}
                loading={loading === method}
                onClick={() => void start(method)}
              >
                {loading === method
                  ? 'Starting…'
                  : `Upgrade via ${
                      method === 'stripe'
                        ? 'Card'
                        : method === 'crypto'
                        ? 'Crypto'
                        : method
                    }`}
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-small text-muted-foreground">
            You already have the highest quota for this feature. Contact support if you need bespoke limits.
          </div>
        )}

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-small">
            <p className="font-medium">Checkout error</p>
            <p className="opacity-80">{error}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
