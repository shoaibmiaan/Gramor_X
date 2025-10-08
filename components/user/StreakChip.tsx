import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/design-system/Icon';

type Props = {
  value: number;
  href?: string;
  loading?: boolean;
  className?: string;
};

function ChipContent({ value, loading }: { value: number; loading?: boolean }) {
  const label = loading ? '—' : value;
  const description = loading ? 'Loading streak' : `${value} day${value === 1 ? '' : 's'} streak`;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-small font-semibold text-foreground shadow-sm"
      aria-live="polite"
    >
      <Icon name="fire" size={16} aria-hidden />
      <span className="tabular-nums text-body">{label}</span>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">days</span>
      <span className="sr-only">{description}</span>
    </span>
  );
}

export const StreakChip: React.FC<Props> = ({ value, href, loading, className }) => {
  const chip = <ChipContent value={value} loading={loading} />;
  if (!href) {
    return <span className={className}>{chip}</span>;
  }
  return (
    <Link
      href={href}
      className={[
        'inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={loading ? 'Loading streak' : `${value}-day streak`}
    >
      {chip}
    </Link>
  );
};

export default StreakChip;
