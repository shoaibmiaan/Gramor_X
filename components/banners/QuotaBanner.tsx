import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Link from 'next/link';

type Props = {
  reason?: string | null;
  module?: string | null;
  remaining?: string | null;
  resetAt?: string | null;
  from?: string | null;
};

export default function QuotaBanner({ reason, module, remaining, resetAt, from }: Props) {
  if (reason !== 'quota_exhausted') return null;

  const readableModule = (module ?? 'your plan').replace(/_/g, ' ');
  const resetCopy = resetAt ? ` Resets ${new Date(resetAt).toLocaleString()}.` : '';

  return (
    <Card className="card-surface mb-6 rounded-ds-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h4 font-semibold">You’re out of quota</h2>
            <Badge variant="warning" size="sm">Heads up</Badge>
          </div>
          <p className="mt-1 text-body opacity-90">
            You tried to start <strong>{readableModule}</strong>, but your current plan has no remaining attempts.
            {resetCopy}
          </p>
          {typeof remaining !== 'undefined' && remaining !== null && (
            <p className="mt-1 text-body text-muted-foreground">
              Remaining: <strong>{remaining}</strong>
            </p>
          )}
          {from && (
            <p className="mt-1 text-sm opacity-75">
              You came from <code className="px-1 py-0.5 rounded bg-muted">{from}</code>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild variant="primary" className="rounded-ds">
            <Link href={`/checkout?module=${encodeURIComponent(module ?? 'writing')}`}>Upgrade & Continue</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-ds">
            <Link href="/referrals">Earn free attempts</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
