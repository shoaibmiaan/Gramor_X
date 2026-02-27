import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card } from '@/components/ui/Card';

export default function billingPage() {
  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This module is now aligned with the enterprise dashboard architecture.
        </p>
      </Card>
    </DashboardShell>
  );
}
