import * as React from 'react';
import Link from 'next/link';
import { cx, Variant, Size, PolymorphicProps } from './_core/types';

type BaseProps = {
  variant?: Variant;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: Size;
  iconOnly?: boolean;
  shape?: 'square' | 'circle';
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
  href?: string;       // convenience for links
  asChild?: boolean;   // Radix-style: render child as the actual element
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;   // ✅ Added loading prop
};

type ButtonComponent = <E extends React.ElementType = 'button'>(
  props: PolymorphicProps<E, BaseProps>
) => React.ReactElement | null;

const variantClass: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-secondary text-white hover:bg-secondary/90',
  outline:   'border border-border bg-transparent hover:bg-white/5',
  ghost:     'bg-transparent hover:bg-white/10',
  link:      'underline underline-offset-4 hover:no-underline',
  accent:    'bg-accent text-black hover:bg-accent/90',
  warning:   'bg-warning text-black hover:bg-warning/90',
  danger:    'bg-danger text-white hover:bg-danger/90',
  error:     'bg-danger text-white hover:bg-danger/90',
  success:   'bg-success text-white hover:bg-success/90',
  info:      'bg-electricBlue text-white hover:bg-electricBlue/90',
  subtle:    'bg-white/5 text-white/90 hover:bg-white/10',
};

const sizeClass: Record<Size, string> = {
  xs: 'h-7 px-2 text-caption',
  sm: 'h-8 px-3 text-small',
  md: 'h-10 px-4 text-small',
  lg: 'h-11 px-5 text-body',
  xl: 'h-12 px-6 text-h4',
};

export const Button: ButtonComponent = (props) => {
  const {
    as, asChild, href, variant = 'primary', size = 'md',
    iconOnly, shape, fullWidth, className, children,
    leadingIcon, trailingIcon, loading, ...rest
  } = props as BaseProps & any;

  const classes = cx(
    'inline-flex items-center justify-center rounded-2xl transition-colors focus:outline-none focus:ring-2 ring-primary/40',
    'gap-2', // spacing for icon + label
    sizeClass[size as Size],  // Explicit type assertion for Size
    fullWidth ? 'w-full' : '',
    variantClass[variant as Variant],  // Explicit type assertion for Variant
    loading && 'cursor-not-allowed opacity-70', // Disable button during loading
  );

  const shapeCls =
    iconOnly && shape === 'square' ? 'aspect-square p-0' :
    iconOnly && shape === 'circle' ? 'aspect-square p-0 rounded-full' : '';

  // Render child as the button (asChild pattern)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: cx((children as any).props?.className, classes, shapeCls, className),
      ...rest,
    });
  }

  const Comp: any =
    as ?? (href ? (href.startsWith('/') ? Link : 'a') : 'button');

  return (
    <Comp href={href} className={cx(classes, shapeCls, className)} {...rest} disabled={loading}>
      {loading && <span className="inline-block h-4 w-4 animate-spin border-2 border-current border-r-transparent rounded-full" />}
      {leadingIcon && <span className="inline-flex shrink-0 items-center">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="inline-flex shrink-0 items-center">{trailingIcon}</span>}
    </Comp>
  );
};

export default Button;
