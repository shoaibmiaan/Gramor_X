// components/design-system/NavLink.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

type AnchorProps = React.ComponentPropsWithoutRef<'a'>;

type Props = {
  href: string;
  exact?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** NEW: allow label prop for convenience (DesktopNav uses this) */
  label?: string;
} & Omit<AnchorProps, 'href'>;

export function NavLink({
  href,
  exact,
  className,
  children,
  label,          // ✅ new
  onClick,
  ...rest
}: Props) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname?.startsWith(href);
  const content = children ?? label; // ✅ prefer children, fallback to label

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[className, isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {content}
    </Link>
  );
}
