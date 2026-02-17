import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';

type HeaderLogoProps = {
  /** Use the animated gradient wordmark (only for the default variant). */
  animated?: boolean;
  /** Force dark-surface mono mark (e.g., dark header). If omitted, we infer from theme. */
  onDark?: boolean;
  /** Wordmark = default (gradient) | mono (solid). */
  variant?: 'default' | 'mono';
  /** Pixel height to render at (SVG scales crisply). */
  height?: number;
  /** Wrap in a home link. */
  asLink?: boolean;
  /** Pass extra classes to the wrapper. */
  className?: string;
  /** Next/Image priority hint. */
  priority?: boolean;
  /** Optional tagline below the logo. */
  tagline?: string;
};

const DEFAULT_HEIGHT = 48;

export function HeaderLogo({
  animated = false,
  onDark,
  variant = 'default',
  height = DEFAULT_HEIGHT,
  asLink = true,
  className = '',
  priority = true,
  tagline,
}: HeaderLogoProps) {
  const { theme } = useTheme();

  // Decide mono polarity if needed
  const isDarkSurface = typeof onDark === 'boolean'
    ? onDark
    : theme === 'dark';

  // Choose source
  const src =
    variant === 'mono'
      ? isDarkSurface
        ? '/branding/gramorx-ai-logo-mono-light.svg'
        : '/branding/gramorx-ai-logo-mono-dark.svg'
      : animated
        ? '/branding/gramorx-ai-logo-primary-animated.svg'
        : '/branding/gramorx-ai-logo-primary-static.svg';

  const img = (
    <Image
      src={src}
      alt="GramorX AI"
      width={Math.round(height * 3.75)} // ~aspect for wordmark
      height={height}
      priority={priority}
      // No inline styles; sizing is token/prop driven
    />
  );

  const Tag = asLink ? Link : React.Fragment;
  const tagProps = asLink ? { href: '/', 'aria-label': 'GramorX AI' } : {};

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      {/* @ts-expect-error React.Fragment vs Link */}
      <Tag {...tagProps}>{img}</Tag>
      {tagline ? (
        <span className="text-xs md:text-sm text-muted-foreground">
          {tagline}
        </span>
      ) : null}
    </div>
  );
}

/** Convenience wrapper: gradient wordmark on light headers */
export function HeaderLogoLight(props: Omit<HeaderLogoProps, 'variant' | 'onDark'>) {
  return <HeaderLogo {...props} variant="default" onDark={false} />;
}

/** Convenience wrapper: mono mark for dark headers */
export function HeaderLogoDark(props: Omit<HeaderLogoProps, 'variant' | 'onDark'>) {
  return <HeaderLogo {...props} variant="mono" onDark />;
}
