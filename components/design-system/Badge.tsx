// components/design-system/Badge.tsx
'use client';

import * as React from 'react';
import clsx from 'clsx';

/**
 * Design System — Badge
 * - Polymorphic (via `as`), default <span>
 * - Token classes only (no inline colors)
 * - Variants + sizes aligned with DS
 */

type Variant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'primary'
  | 'secondary';
type Size = 'sm' | 'md';

type OwnProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
  /** Polymorphic tag (a, span, div, etc.) */
  as?: React.ElementType;
  /** Accessible live region utility for dynamic statuses */
  ariaLive?: 'off' | 'polite' | 'assertive';
};

type AsProp<C extends React.ElementType> = { as?: C };
type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);
type PolymorphicProps<C extends React.ElementType, Props> = Props &
  AsProp<C> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

const sizeClasses: Record<Size, string> = {
  sm: 'text-2xs px-2 py-0.5 rounded-ds-md',
  md: 'text-xs px-2.5 py-1 rounded-ds-lg',
};

// Map DS variants to tokenized classes. Adjust to your tokens if needed.
const variantClasses: Record<Variant, string> = {
  neutral: 'badge badge-neutral',
  info: 'badge badge-info',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
  accent: 'badge badge-accent',
  primary: 'badge badge-primary',
  secondary: 'badge badge-secondary',
};

function baseClasses(variant: Variant, size: Size) {
  return clsx(
    'inline-flex items-center gap-1 font-medium whitespace-nowrap',
    sizeClasses[size],
    variantClasses[variant]
  );
}

/**
 * Badge component
 * - Defaults to <span>
 * - If you pass `role="status"`, consider `ariaLive="polite"` for SRs
 */
export const Badge = React.forwardRef(
  <C extends React.ElementType = 'span'>(
    {
      as,
      variant = 'neutral',
      size = 'sm',
      className,
      children,
      ariaLive,
      role,
      ...rest
    }: PolymorphicProps<C, OwnProps> & { role?: React.AriaRole },
    ref: React.Ref<Element>
  ) => {
    const Tag = (as || 'span') as React.ElementType;
    const classes = clsx(baseClasses(variant, size), className);

    const ariaProps: Record<string, any> = {};
    if (role === 'status' && ariaLive) {
      ariaProps['aria-live'] = ariaLive;
    }

    return (
      <Tag ref={ref as any} className={classes} role={role} {...ariaProps} {...(rest as any)}>
        {children}
      </Tag>
    );
  }
) as <C extends React.ElementType = 'span'>(
  props: PolymorphicProps<C, OwnProps> & { role?: React.AriaRole } & { ref?: React.Ref<Element> }
) => React.ReactElement | null;

(Badge as any).displayName = 'Badge';

export default Badge;

