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
  primary:  'bg-accent/15 text-accent ring-1 ring-accent/30',
  secondary:'bg-accent2/15 text-accent2 ring-1 ring-accent2/30',
  accent:   'bg-accent/15 text-accent ring-1 ring-accent/30',
  warning:  'bg-warn/15 text-warn ring-1 ring-warn/30',
  danger:   'bg-bad/15 text-bad ring-1 ring-bad/30',
  error:    'bg-bad/15 text-bad ring-1 ring-bad/30',
  success:  'bg-ok/15 text-ok ring-1 ring-ok/30',
  info:     'bg-accent2/15 text-accent2 ring-1 ring-accent2/30',
  subtle:   'bg-card/70 text-muted ring-1 ring-border/40',
  neutral:  'bg-panel text-muted ring-1 ring-border/50',
};

const sizeCls: Record<NonNullable<Props['size']>, string> = {
  xs: 'px-xs py-2xs text-micro rounded-ds-lg',
  sm: 'px-sm py-xs text-caption rounded-ds-xl',
  md: 'px-md py-xs text-small rounded-ds-xl',
  lg: 'px-lg py-xs text-body rounded-ds-2xl',
};

export function Badge({ variant='subtle', size='sm', className, children }: Props) {
  return (
    <span className={cx('inline-flex items-center font-medium', sizeCls[size], variantCls[variant], className)}>
      {children}
    </span>
  );
}

export default Badge;
