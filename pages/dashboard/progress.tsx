import { Card } from '@/components/ui/Card';
import { VocabInsightsCards } from '@/components/quiz/VocabInsightsCards';

export default function progressPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This module is now aligned with the enterprise dashboard architecture.
        </p>
      </Card>
      <VocabInsightsCards />
    </div>
  );
}
