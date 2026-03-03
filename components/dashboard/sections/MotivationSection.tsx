import { Card } from '@/components/design-system/Card';

export function MotivationSection({ streak }: { streak: number }) {
  return (
    <section className="mt-12">
      <Card className="p-6" interactive>
        <h2 className="text-base font-semibold">Motivation & Momentum</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {streak < 3
            ? 'Your streak is low—complete one quick task today to rebuild consistency.'
            : 'Great consistency—keep your streak alive to compound your score growth.'}
        </p>
      </Card>
    </section>
  );
}
