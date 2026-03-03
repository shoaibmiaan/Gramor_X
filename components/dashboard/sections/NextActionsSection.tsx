import { Card } from '@/components/design-system/Card';

type Recommendation = {
  taskId: string;
  title: string;
  module: string;
  type: string;
  reason: string;
};

export function NextActionsSection({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <section className="mt-12 grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2" interactive>
        <h2 className="text-base font-semibold">Recommended for You</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Today&apos;s recommendations based on your latest skill profile.
        </p>
        <div className="mt-3 space-y-2">
          {recommendations.slice(0, 5).map((item) => (
            <div key={item.taskId} className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.module} · {item.type} · {item.reason}
              </p>
            </div>
          ))}
          {!recommendations.length ? (
            <p className="text-xs text-muted-foreground">No personalized exercises yet.</p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
