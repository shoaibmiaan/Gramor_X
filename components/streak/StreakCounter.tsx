import * as React from 'react';
import { Card } from '@/components/design-system/Card';

let tooltipIdSeed = 0;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type StreakCounterProps = {
  className?: string;
  current: number;
  longest: number;
  loading?: boolean;
  shields?: number;
};

type StatProps = {
  label: string;
  value: number;
  tone: 'primary' | 'neutral';
  loading?: boolean;
};

const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...rest }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={cn('h-4 w-4', className)} aria-hidden="true" {...rest}>
    <path d="M10 1.667A8.333 8.333 0 1 0 18.333 10 8.344 8.344 0 0 0 10 1.667Zm0 12.5a.833.833 0 0 1-1.667 0v-4.167a.833.833 0 0 1 1.667 0Zm0-6.25A1.042 1.042 0 1 1 11.042 6.875 1.042 1.042 0 0 1 10 7.917Z" />
  </svg>
);

const Stat: React.FC<StatProps> = ({ label, value, tone, loading = false }) => {
  const toneClass =
    tone === 'primary'
      ? 'bg-electricBlue/10 text-electricBlue dark:bg-electricBlue/15'
      : 'bg-muted/80 text-foreground dark:bg-muted/50';

  return (
    <div className={cn('rounded-xl px-4 py-3 text-center sm:text-left', toneClass)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">{label}</span>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded-full bg-muted/60" aria-hidden="true" />
      ) : (
        <div className="mt-1 flex items-baseline justify-center gap-1 sm:justify-start">
          <span className="font-semibold tabular-nums text-h4">{value}</span>
          <span className="text-xs font-medium uppercase tracking-wide">days</span>
        </div>
      )}
    </div>
  );
};

export const StreakCounter: React.FC<StreakCounterProps> = ({
  className,
  current,
  longest,
  loading = false,
  shields = 0,
}) => {
  const tooltipIdRef = React.useRef<string>();
  if (!tooltipIdRef.current) {
    const nextId = ++tooltipIdSeed;
    tooltipIdRef.current = `streak-tooltip-${nextId}`;
  }
  const tooltipId = tooltipIdRef.current;
  const [open, setOpen] = React.useState(false);

  const safeCurrent = Number.isFinite(current) ? Math.max(0, Math.trunc(current)) : 0;
  const safeLongest = Number.isFinite(longest) ? Math.max(safeCurrent, Math.trunc(longest)) : safeCurrent;
  const safeShields = Number.isFinite(shields) ? Math.max(0, Math.trunc(shields)) : 0;

  const showTooltip = () => setOpen(true);
  const hideTooltip = () => setOpen(false);

  return (
    <Card className={cn('flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-slab text-h4 text-foreground">Daily streak</h2>
          <div className="relative">
            <button
              type="button"
              aria-describedby={tooltipId}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2"
              onFocus={showTooltip}
              onBlur={hideTooltip}
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            >
              <InfoIcon />
              <span className="sr-only">Learn how streaks work</span>
            </button>
            <div
              id={tooltipId}
              role="tooltip"
              aria-hidden={!open}
              className={cn(
                'absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-left text-xs text-muted-foreground shadow-lg transition-opacity duration-150',
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
            >
              Complete at least one learning task before midnight Pakistan time to extend your streak.
            </div>
          </div>
        </div>
        <p className="text-small text-muted-foreground">
          Keep your streak alive to unlock streak shields and weekly reward drops.
        </p>
      </div>
      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
        <Stat label="Current streak" value={safeCurrent} tone="primary" loading={loading} />
        <Stat label="Longest streak" value={safeLongest} tone="neutral" loading={loading} />
        <Stat label="Forgiveness tokens" value={safeShields} tone="neutral" loading={loading} />
      </div>
    </Card>
  );
};

export default StreakCounter;
