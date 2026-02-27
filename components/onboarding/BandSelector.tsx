import React from 'react';
import { cn } from '@/lib/utils';

export type Band = 4.0 | 4.5 | 5.0 | 5.5 | 6.0 | 6.5 | 7.0 | 7.5 | 8.0 | 8.5 | 9.0;

const BAND_OPTIONS: Band[] = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

interface BandSelectorProps {
  value: Band | null;
  onChange: (band: Band) => void;
  disabled?: boolean;
  className?: string;
}

export const BandSelector: React.FC<BandSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('flex flex-wrap justify-center gap-2 sm:gap-3', className)}>
      {BAND_OPTIONS.map((band) => (
        <button
          key={band}
          type="button"
          onClick={() => onChange(band)}
          disabled={disabled}
          className={cn(
            'h-12 w-16 rounded-xl border text-center font-semibold transition-all sm:h-14 sm:w-20',
            value === band
              ? 'border-primary bg-primary text-primary-foreground shadow-md'
              : 'border-border bg-card hover:border-primary/50 hover:bg-muted',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {band}
        </button>
      ))}
    </div>
  );
};