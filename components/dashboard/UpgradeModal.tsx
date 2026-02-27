import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { SubscriptionTier } from '@/types/dashboard';

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  requiredTier: SubscriptionTier;
};

export function UpgradeModal({ open, onClose, requiredTier }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md space-y-4">
        <h3 className="text-lg font-medium">Upgrade to {requiredTier}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This enterprise feature is available on the {requiredTier} tier. Unlock full AI reports
          and premium analytics.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button onClick={onClose}>View plans</Button>
        </div>
      </Card>
    </div>
  );
}
