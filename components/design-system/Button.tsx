import * as React from 'react';
import Link from 'next/link';
import { cx, Variant, Size, PolymorphicProps } from './_core/types';

type Tone =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'error'
  | 'success'
  | 'info';

type BaseProps = {
  // Extend Variant to allow "soft" without touching the shared type file
  variant?: Variant | 'soft';
  tone?: Tone;
  size?: Size;
  iconOnly?: boolean;
  shape?: 'square' | 'circle' | 'rounded';
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
  href?: string;       // convenience for links
  asChild?: boolean;   // Radix-style: render child as the actual element
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  elevateOnHover?: boolean;
};

type ButtonComponent = <E extends React.ElementType = 'button'>(
  props: PolymorphicProps<E, BaseProps> & { as?: any }
) => React.ReactElement | null;

// "solid" style variants from DS tokens
const variantClass: Record<Variant, string> = {
  primary:   'bg-accent text-bg-light hover:bg-accent/90',
  secondary: 'bg-accent2 text-bg-light hover:bg-accent2/90',
  outline:   'border border-border bg-transparent text-text hover:bg-panel/60',
  ghost:     'bg-transparent text-text hover:bg-panel/60',
  link:      'text-accent underline underline-offset-4 hover:no-underline',
  accent:    'bg-accent text-bg-light hover:bg-accent/85',
  warning:   'bg-warn text-text hover:bg-warn/90',
  danger:    'bg-bad text-bg-light hover:bg-bad/90',
  error:     'bg-bad text-bg-light hover:bg-bad/90',
  success:   'bg-ok text-bg-light hover:bg-ok/90',
  info:      'bg-accent2 text-bg-light hover:bg-accent2/85',
  subtle:    'bg-card/60 text-text hover:bg-card',
};

// tonal classes for the "soft" variant
const softTone: Record<Tone, string> = {
  default:   'bg-card text-text ring-1 ring-border/60 hover:bg-card/80',
  primary:   'bg-accent/15 text-accent ring-1 ring-accent/30 hover:bg-accent/20',
  secondary: 'bg-accent2/15 text-accent2 ring-1 ring-accent2/30 hover:bg-accent2/20',
  accent:    'bg-accent/15 text-accent ring-1 ring-accent/30 hover:bg-accent/20',
  warning:   'bg-warn/15 text-warn ring-1 ring-warn/30 hover:bg-warn/20',
  danger:    'bg-bad/15 text-bad ring-1 ring-bad/30 hover:bg-bad/20',
  error:     'bg-bad/15 text-bad ring-1 ring-bad/30 hover:bg-bad/20',
  success:   'bg-ok/15 text-ok ring-1 ring-ok/30 hover:bg-ok/20',
  info:      'bg-accent2/15 text-accent2 ring-1 ring-accent2/30 hover:bg-accent2/20',
};

const sizeClass: Record<Size, string> = {
  xs: 'h-8 px-xs text-caption',
  sm: 'h-9 px-sm text-small',
  md: 'h-11 px-md text-small',
  lg: 'h-12 px-lg text-body',
  xl: 'h-14 px-xl text-h5',
};

export const Button: ButtonComponent = (props) => {
  const {
    as, asChild, href,
    variant = 'primary',
    tone = 'default',
    size = 'md',
    iconOnly,
    shape,
    fullWidth,
    className,
    children,
    leadingIcon,
    trailingIcon,
    loading,
    loadingText,
    elevateOnHover,
    ...rest
  } = props as BaseProps & any;

  // computed variant class (support "soft")
  const variantCls =
    variant === 'soft'
      ? softTone[tone]
      : variantClass[variant as Variant];

  const classes = cx(
    // base
    'inline-flex items-center justify-center gap-xs font-medium transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    sizeClass[size as Size],
    fullWidth && 'w-full',
    variantCls,
    loading && 'cursor-not-allowed opacity-70',
    elevateOnHover && 'shadow-none hover:shadow-md transition-shadow',
    // default rounded shape; allow explicit shape override
    shape === 'rounded' ? 'rounded-ds-xl' : 'rounded-ds-2xl'
  );

  const shapeCls =
    iconOnly && shape === 'square' ? 'aspect-square p-0' :
    iconOnly && shape === 'circle' ? 'aspect-square p-0 rounded-full' : '';

  // asChild pattern
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: cx((children as any).props?.className, classes, shapeCls, className),
      ...rest,
    });
  }

  const Comp: any = as ?? (href ? (href.startsWith('/') ? Link : 'a') : 'button');

  return (
    <Comp
      href={href}
      className={cx(classes, shapeCls, className)}
      aria-busy={loading ? 'true' : undefined}
      data-loading={loading ? 'true' : undefined}
      {...rest}
      // only disables native <button>; anchors/Link ignore 'disabled' but we still provide aria-busy
      disabled={Comp === 'button' ? !!loading : undefined}
    >
      {loading && (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin border-2 border-current border-r-transparent rounded-full" />
          {loadingText && <span>{loadingText}</span>}
        </span>
      )}
      {!loading && leadingIcon && <span className="inline-flex shrink-0 items-center">{leadingIcon}</span>}
      {!loading && children}
      {!loading && trailingIcon && <span className="inline-flex shrink-0 items-center">{trailingIcon}</span>}
    </Comp>
  );
};

export default Button;
