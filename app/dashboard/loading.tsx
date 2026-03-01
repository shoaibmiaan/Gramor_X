import { SkeletonCard } from '@/components/loading/Skeletons';

export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6" aria-live="polite" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
