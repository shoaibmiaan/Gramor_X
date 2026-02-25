// components/design-system/Progress.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assume cn utility for className merging

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: ProgressVariant;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-destructive',
    };

    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
        {...props}
      >
        <div
          className={cn(
            'h-full w-full flex-1 transition-all duration-300 ease-out',
            variantClasses[variant]
          )}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${value}/${max} (${percentage.toFixed(1)}%)`}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };