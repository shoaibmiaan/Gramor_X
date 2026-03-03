import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type UpgradePromptProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
};

export function UpgradePrompt({
  title = 'Upgrade required',
  description = 'This feature requires an active subscription. Upgrade your plan to continue.',
  ctaLabel = 'View pricing',
}: UpgradePromptProps) {
  return (
    <Card>
      <div className="space-y-3 p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <Link href="/pricing">
          <Button>{ctaLabel}</Button>
        </Link>
      </div>
    </Card>
  );
}

export default UpgradePrompt;
