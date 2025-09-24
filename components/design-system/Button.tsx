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

// tonal classes for the "soft" variant
const softTone: Record<Tone, string> = {
  default:   'bg-card text-foreground ring-1 ring-border/50 hover:bg-card/90',
  primary:   'bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/20',
  secondary: 'bg-secondary/15 text-secondary ring-1 ring-secondary/30 hover:bg-secondary/20',
  accent:    'bg-accent/15 text-accent ring-1 ring-accent/30 hover:bg-accent/20',
  warning:   'bg-warning/15 text-warning ring-1 ring-warning/30 hover:bg-warning/20',
  danger:    'bg-danger/15 text-danger ring-1 ring-danger/30 hover:bg-danger/20',
  error:     'bg-danger/15 text-danger ring-1 ring-danger/30 hover:bg-danger/20',
  success:   'bg-success/15 text-success ring-1 ring-success/30 hover:bg-success/20',
  info:      'bg-electricBlue/15 text-electricBlue ring-1 ring-electricBlue/30 hover:bg-electricBlue/20',
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
    'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 ring-primary/40',
    'gap-2',
    sizeClass[size as Size],
    fullWidth && 'w-full',
    variantCls,
    loading && 'cursor-not-allowed opacity-70',
    elevateOnHover && 'shadow-none hover:shadow-md transition-shadow',
    // default rounded shape; allow explicit shape override
    shape === 'rounded' ? 'rounded-ds-xl' : 'rounded-2xl'
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
