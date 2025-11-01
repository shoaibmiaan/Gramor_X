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
  error:   { box: 'bg-bad/15 text-bad ring-1 ring-bad/30',       title: 'text-bad' },
  danger:  { box: 'bg-bad/15 text-bad ring-1 ring-bad/30',       title: 'text-bad' },
  success: { box: 'bg-ok/15 text-ok ring-1 ring-ok/30',          title: 'text-ok' },
  info:    { box: 'bg-accent2/15 text-accent2 ring-1 ring-accent2/30', title: 'text-accent2' },
  warning: { box: 'bg-warn/15 text-warn ring-1 ring-warn/30',    title: 'text-warn' },
};

const solid: Record<NonNullable<Props['variant']>, { box: string; title: string }> = {
  error:   { box: 'bg-bad text-bg-light',       title: 'text-bg-light/90' },
  danger:  { box: 'bg-bad text-bg-light',       title: 'text-bg-light/90' },
  success: { box: 'bg-ok text-bg-light',        title: 'text-bg-light/90' },
  info:    { box: 'bg-accent2 text-bg-light',   title: 'text-bg-light/90' },
  warning: { box: 'bg-warn text-text',          title: 'text-text/80' },
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
    <div className={cx('rounded-ds-xl border border-border/50 p-md shadow-sm', v.box, className)} {...rest}>
      {title && <div className={cx('mb-1 font-semibold', v.title)}>{title}</div>}
      <div className="text-small leading-6 text-text/90">{children}</div>
    </div>
  );
}

export default Alert;
