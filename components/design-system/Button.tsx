'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';

/**
 * Design-System Button
 * - Supports `asChild` (Radix Slot) to wrap Next <Link>, etc.
 * - Supports `href` to auto-render <Link> for internal navigation.
 * - Tokenized classes only; no inline colors.
 *
 * Project rules honored:
 * - Navigation: use Link/NavLink for internal nav.
 * - Type safety: strong props.
 * - Styling: DS tokens only.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'soft';
type Size = 'sm' | 'md' | 'lg';
type Tone = 'primary' | 'secondary' | 'accent' | 'neutral';
type Shape = 'rounded' | 'pill' | 'square';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  tone?: Tone; // used with "soft" or secondary styles
  shape?: Shape;
  fullWidth?: boolean;
  elevateOnHover?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  asChild?: boolean;

  /** Optional href:
   * - If provided and starts with '/', we render a Next <Link>.
   * - If external (http/https), we render <a> with rel+target.
   */
  href?: string;
};

type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'color'
> &
  CommonProps;

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & CommonProps;

function isExternal(href?: string) {
  return !!href && /^(https?:)?\/\//i.test(href);
}

function baseClasses({
  variant = 'primary',
  size = 'md',
  tone = 'primary',
  shape = 'rounded',
  fullWidth,
  elevateOnHover,
  loading,
}: CommonProps) {
  // Tokenized utilities only
  const sizeCls =
    size === 'sm'
      ? 'h-9 px-3 text-sm'
      : size === 'lg'
        ? 'h-11 px-5 text-base'
        : 'h-10 px-4 text-sm';

  const shapeCls =
    shape === 'pill'
      ? 'rounded-full'
      : shape === 'square'
        ? 'rounded-none'
        : 'rounded-ds-xl';

  // Variants (map to your DS tokens/helpers)
  const variantCls = (() => {
    switch (variant) {
      case 'primary':
        return 'btn btn-primary';
      case 'secondary':
        return 'btn btn-secondary';
      case 'ghost':
        return 'btn btn-ghost';
      case 'outline':
        return 'btn btn-outline';
      case 'destructive':
        return 'btn btn-danger';
      case 'soft':
        // "soft" uses tone to pick a tokenized soft style
        if (tone === 'accent') return 'btn btn-soft-accent';
        if (tone === 'secondary') return 'btn btn-soft-secondary';
        if (tone === 'neutral') return 'btn btn-soft-neutral';
        return 'btn btn-soft-primary';
      default:
        return 'btn btn-primary';
    }
  })();

  return clsx(
    'inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed select-none',
    sizeCls,
    shapeCls,
    variantCls,
    fullWidth && 'w-full',
    elevateOnHover && 'transition-shadow hover:shadow-glow',
    loading && 'opacity-80'
  );
}

const Content: React.FC<
  React.PropsWithChildren<{
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
    loading?: boolean;
    loadingText?: string;
  }>
> = ({ leadingIcon, trailingIcon, loading, loadingText, children }) => {
  return (
    <>
      {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
      <span className="truncate">{loading ? loadingText ?? 'Loading…' : children}</span>
      {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </>
  );
};

/**
 * Polymorphic Button
 * - If `asChild` => render <Slot>.
 * - Else if `href` => render <Link> (internal) or <a> (external).
 * - Else render <button>.
 */
export const Button = React.forwardRef<
  HTMLButtonElement & HTMLAnchorElement,
  ButtonProps | AnchorProps
>(function Button(props, ref) {
  const {
    asChild,
    href,
    className,
    variant,
    size,
    tone,
    shape,
    fullWidth,
    elevateOnHover,
    leadingIcon,
    trailingIcon,
    loading,
    loadingText,
    children,
    ...rest
  } = props as ButtonProps & AnchorProps;

  const classes = clsx(
    baseClasses({ variant, size, tone, shape, fullWidth, elevateOnHover, loading }),
    className
  );

  // 1) asChild: let consumer pass <Link> or anything; we only style it
  if (asChild) {
    return (
      <Slot className={classes} {...(rest as any)} ref={ref as any}>
        <Content
          leadingIcon={leadingIcon}
          trailingIcon={trailingIcon}
          loading={loading}
          loadingText={loadingText}
        >
          {children}
        </Content>
      </Slot>
    );
  }

  // 2) href: decide between internal Link vs external anchor
  if (href) {
    if (isExternal(href)) {
      return (
        <a
          className={classes}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...(rest as any)}
          ref={ref as any}
        >
          <Content
            leadingIcon={leadingIcon}
            trailingIcon={trailingIcon}
            loading={loading}
            loadingText={loadingText}
          >
            {children}
          </Content>
        </a>
      );
    }
    // Internal — Next Link
    return (
      <Link className={classes} href={href} {...(rest as any)}>
        <Content
          leadingIcon={leadingIcon}
          trailingIcon={trailingIcon}
          loading={loading}
          loadingText={loadingText}
        >
          {children}
        </Content>
      </Link>
    );
  }

  // 3) default: <button>
  return (
    <button className={classes} {...(rest as any)} ref={ref as any} disabled={(rest as any)?.disabled || loading}>
      <Content
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        loading={loading}
        loadingText={loadingText}
      >
        {children}
      </Content>
    </button>
  );
});

export default Button;
