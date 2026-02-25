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

const soft: Record<NonNullable<Props['variant']>, { box: string; title: string }> = {
  error:   { box: 'bg-danger/15 text-danger ring-1 ring-danger/30',                 title: 'text-danger' },
  danger:  { box: 'bg-danger/15 text-danger ring-1 ring-danger/30',                 title: 'text-danger' },
  success: { box: 'bg-success/15 text-success ring-1 ring-success/30',              title: 'text-success' },
  info:    { box: 'bg-electricBlue/15 text-electricBlue ring-1 ring-electricBlue/30', title: 'text-electricBlue' },
  warning: { box: 'bg-warning/15 text-warning ring-1 ring-warning/30',              title: 'text-warning' },
};

const solid: Record<NonNullable<Props['variant']>, { box: string; title: string }> = {
  error:   { box: 'bg-danger text-white',            title: 'text-white/90' },
  danger:  { box: 'bg-danger text-white',            title: 'text-white/90' },
  success: { box: 'bg-success text-white',           title: 'text-white/90' },
  info:    { box: 'bg-electricBlue text-white',      title: 'text-white/90' },
  warning: { box: 'bg-warning text-black',           title: 'text-black/70' },
};

export function Alert({
  title,
  children,
  variant = 'info',  // Default variant set to 'info'
  appearance = 'soft',  // Default appearance set to 'soft'
  className,
  ...rest
}: Props) {
  // Safeguard: Ensure variant is valid
  const map = appearance === 'solid' ? solid : soft;
  const v = map[variant] || solid.info;  // Fallback to 'info' if variant is invalid

  return (
    <div className={cx('rounded-xl p-4', v.box, className)} {...rest}>
      {title && <div className={cx('mb-1 font-semibold', v.title)}>{title}</div>}
      <div className="text-small leading-6">{children}</div>
    </div>
  );
}

export default Alert;
