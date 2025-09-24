import * as React from 'react';
import { cx, Size } from './_core/types';

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'error'
  | 'success'
  | 'info'
  | 'subtle'
  | 'neutral';

type Props = {
  variant?: BadgeVariant;
  size?: Exclude<Size, 'xl'>;
  className?: string;
  children?: React.ReactNode;
};

const variantCls: Record<BadgeVariant, string> = {
  primary:  'bg-primary/15 text-primary ring-1 ring-primary/30',
  secondary:'bg-secondary/15 text-secondary ring-1 ring-secondary/30',
  accent:   'bg-accent/15 text-accent ring-1 ring-accent/30',
  warning:  'bg-warning/15 text-warning ring-1 ring-warning/30',
  danger:   'bg-danger/15 text-danger ring-1 ring-danger/30',
  error:    'bg-danger/15 text-danger ring-1 ring-danger/30',
  success:  'bg-success/15 text-success ring-1 ring-success/30',
  info:     'bg-electricBlue/15 text-electricBlue ring-1 ring-electricBlue/30',
  subtle:   'bg-white/5 text-white/80 ring-1 ring-white/10',
  neutral:  'bg-grayish/15 text-grayish ring-1 ring-grayish/30',
};

const sizeCls: Record<NonNullable<Props['size']>, string> = {
  xs: 'px-1.5 py-0.5 text-micro rounded-md',
  sm: 'px-2 py-0.5 text-caption rounded-lg',
  md: 'px-2.5 py-1 text-small rounded-lg',
  lg: 'px-3 py-1 text-body rounded-xl',
};

export function Badge({ variant='subtle', size='sm', className, children }: Props) {
  return (
    <span className={cx('inline-flex items-center font-medium', sizeCls[size], variantCls[variant], className)}>
      {children}
    </span>
  );
}

export default Badge;
