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
  error: { box: 'bg-bad/15 text-bad ring-1 ring-bad/30', title: 'text-bad' },
  danger: { box: 'bg-bad/15 text-bad ring-1 ring-bad/30', title: 'text-bad' },
  success: { box: 'bg-ok/15 text-ok ring-1 ring-ok/30', title: 'text-ok' },
  info: { box: 'bg-panel text-text ring-1 ring-border/40', title: 'text-text' },
  warning: { box: 'bg-warn/15 text-warn ring-1 ring-warn/30', title: 'text-warn' },
};

const solid: Record<NonNullable<Props['variant']>, { box: string; title: string }> = {
  error: { box: 'bg-bad text-bg', title: 'text-bg/80' },
  danger: { box: 'bg-bad text-bg', title: 'text-bg/80' },
  success: { box: 'bg-ok text-bg', title: 'text-bg/80' },
  info: { box: 'bg-accent2 text-bg', title: 'text-bg/80' },
  warning: { box: 'bg-warn text-bg', title: 'text-bg/70' },
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
    <div className={cx('rounded-ds-xl border border-border/60 p-md backdrop-blur-sm', v.box, className)} {...rest}>
      {title && <div className={cx('mb-1 font-semibold text-text', v.title)}>{title}</div>}
      <div className="text-small leading-6 text-text/90">{children}</div>
    </div>
  );
}

export default Alert;
