import * as React from 'react';
import { cx, Variant, Size } from './_core/types';

type Props = {
  variant?: Extract<Variant, 'primary'|'secondary'|'accent'|'warning'|'danger'|'error'|'success'|'info'|'subtle'>;
  size?: Exclude<Size, 'xl'>;
  className?: string;
  children?: React.ReactNode;
};

const variantCls: Record<NonNullable<Props['variant']>, string> = {
  primary:  'bg-primary/15 text-primary ring-1 ring-primary/30',
  secondary:'bg-white/10 text-white/90 ring-1 ring-white/20',
  accent:   'bg-accent/15 text-accent ring-1 ring-accent/30',
  warning:  'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
  danger:   'bg-red-600/15 text-red-300 ring-1 ring-red-500/30',
  error:    'bg-red-600/15 text-red-300 ring-1 ring-red-500/30',
  success:  'bg-emerald-600/15 text-emerald-300 ring-1 ring-emerald-500/30',
  info:     'bg-sky-600/15 text-sky-300 ring-1 ring-sky-500/30',
  subtle:   'bg-white/5 text-white/80 ring-1 ring-white/10',
};

const sizeCls: Record<NonNullable<Props['size']>, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] rounded-md',
  sm: 'px-2 py-0.5 text-xs rounded-lg',
  md: 'px-2.5 py-1 text-sm rounded-lg',
  lg: 'px-3 py-1 text-base rounded-xl',
};

export function Badge({ variant='subtle', size='sm', className, children }: Props) {
  return (
    <span className={cx('inline-flex items-center font-medium', sizeCls[size], variantCls[variant], className)}>
      {children}
    </span>
  );
}
export default Badge;
