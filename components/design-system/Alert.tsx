import * as React from 'react';
import { cx, Variant } from './_core/types';

type Props = {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: Extract<Variant, 'error' | 'success' | 'info' | 'warning' | 'danger'>;
  appearance?: 'soft' | 'solid';
  id?: string;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
};

const map: Record<NonNullable<Props['variant']>, { box: string; title: string }> = {
  error:   { box: 'bg-red-600/15 text-red-200 ring-1 ring-red-500/30',         title: 'text-red-200' },
  danger:  { box: 'bg-red-600/15 text-red-200 ring-1 ring-red-500/30',         title: 'text-red-200' },
  success: { box: 'bg-emerald-600/15 text-emerald-200 ring-1 ring-emerald/30', title: 'text-emerald-200' },
  info:    { box: 'bg-sky-600/15 text-sky-200 ring-1 ring-sky-500/30',         title: 'text-sky-200' },
  warning: { box: 'bg-amber-600/15 text-amber-100 ring-1 ring-amber-500/30',   title: 'text-amber-100' },
};

export function Alert({ title, children, variant = 'info', className, ...rest }: Props) {
  const v = map[variant];
  return (
    <div className={cx('rounded-xl p-4', v.box, className)} {...rest}>
      {title && <div className={cx('mb-1 font-semibold', v.title)}>{title}</div>}
      <div className="text-sm leading-6">{children}</div>
    </div>
  );
}
export default Alert;
