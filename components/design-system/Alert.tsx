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
  error:   { box: 'bg-danger/15 text-danger ring-1 ring-danger/30',           title: 'text-danger' },
  danger:  { box: 'bg-danger/15 text-danger ring-1 ring-danger/30',           title: 'text-danger' },
  success: { box: 'bg-success/15 text-success ring-1 ring-success/30',        title: 'text-success' },
  info:    { box: 'bg-electricBlue/15 text-electricBlue ring-1 ring-electricBlue/30', title: 'text-electricBlue' },
  warning: { box: 'bg-warning/15 text-warning ring-1 ring-warning/30',        title: 'text-warning' },
};

export function Alert({ title, children, variant = 'info', className, ...rest }: Props) {
  const v = map[variant];
  return (
    <div className={cx('rounded-xl p-4', v.box, className)} {...rest}>
      {title && <div className={cx('mb-1 font-semibold', v.title)}>{title}</div>}
      <div className="text-small leading-6">{children}</div>
    </div>
  );
}
export default Alert;
