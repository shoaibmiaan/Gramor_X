export const KpiCardsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {[0, 1, 2, 3].map((idx) => (
      <div key={idx} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
    ))}
  </div>
);

export const ChartSkeleton = () => <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />;

export const InsightsSkeleton = () => <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />;

export const UsageMetersSkeleton = () => <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />;
