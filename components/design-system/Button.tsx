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
  warning:   'bg-amber-500 text-black hover:bg-amber-400',
  danger:    'bg-red-600 text-white hover:bg-red-500',
  error:     'bg-red-600 text-white hover:bg-red-500',
  success:   'bg-emerald-600 text-white hover:bg-emerald-500',
  info:      'bg-sky-600 text-white hover:bg-sky-500',
  subtle:    'bg-white/5 text-white/90 hover:bg-white/10',
};

const sizeClass: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  xl: 'h-12 px-6 text-lg',
};

export const Button: ButtonComponent = (props) => {
  const {
    as, asChild, href, variant = 'primary', size = 'md',
    iconOnly, shape, fullWidth, className, children,
    leadingIcon, trailingIcon, ...rest
  } = props as BaseProps & any;

  const classes = cx(
    'inline-flex items-center justify-center rounded-2xl transition-colors focus:outline-none focus:ring-2 ring-primary/40',
    'gap-2', // spacing for icon + label
    sizeClass[(size ?? "md") as Size],
    fullWidth ? 'w-full' : '',
    variantClass[(variant ?? "primary") as Variant],
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
    as ? as :
    href ? (href.startsWith('/') ? Link : 'a') :
    'button';

  return (
    <Comp href={href} className={cx(classes, shapeCls, className)} {...rest}>
      {leadingIcon && <span className="inline-flex shrink-0 items-center">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="inline-flex shrink-0 items-center">{trailingIcon}</span>}
    </Comp>
  );
};
export default Button;
