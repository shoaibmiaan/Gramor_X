import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card } from '@/components/ui/Card';

export default function readingPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold">Reading</h1>
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This module is now aligned with the enterprise dashboard architecture.
        </p>
      </Card>
    </DashboardLayout>
  );
}
