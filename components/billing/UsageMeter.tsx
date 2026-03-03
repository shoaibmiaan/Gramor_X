import { useMemo } from 'react';
import { useUsage } from '@/hooks/useUsage';

type UsageMeterProps = {
  feature: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  label?: string;
};

export function UsageMeter({ feature, showLabel = true, size = 'md', label }: UsageMeterProps) {
  const { used, limit, percentage, isLoading, error } = useUsage(feature);

  const colorClass = useMemo(() => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [percentage]);

  if (isLoading) {
    return <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />;
  }

  if (error) {
    return <p className="text-xs text-red-500">Usage unavailable: {error}</p>;
  }

  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="space-y-1">
      {showLabel ? (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{label ?? feature}</span>
          <span>
            {used}/{limit}
          </span>
        </div>
      ) : null}
      <div className={`w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${barHeight}`}>
        <div className={`${barHeight} ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
      </div>
    </div>
  );
}

export default UsageMeter;
