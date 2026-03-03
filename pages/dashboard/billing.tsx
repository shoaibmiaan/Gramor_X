import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSubscription } from '@/hooks/useSubscription';
import { UsageMeter } from '@/components/billing/UsageMeter';

export default function BillingPage() {
  const subscription = useSubscription();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Current plan: {subscription.displayPlan.name}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Status: {subscription.statusLabel}
          </p>
          {subscription.renewsAtLabel ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Renews: {subscription.renewsAtLabel}
            </p>
          ) : null}
          <div className="space-y-2">
            <UsageMeter feature="ai.explain" label="AI Explain" />
            <UsageMeter feature="ai.summary" label="AI Summary" />
            <UsageMeter feature="ai.writing.score" label="AI Writing Score" />
          </div>
          <Link href="/profile/account/billing">
            <Button>Manage in billing portal</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
