import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

export type LayoutQuickNavItem = {
  href: string;
  label: string;
  activeClassName?: string;
  isActive?: (pathname: string) => boolean;
  hidden?: boolean;
};

export type LayoutQuickNavProps = {
  items: LayoutQuickNavItem[];
  ariaLabel: string;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
  defaultActiveClassName?: string;
};

const DEFAULT_ITEM_CLASS = 'nav-pill shrink-0 whitespace-nowrap';
const DEFAULT_ACTIVE_CLASS = 'bg-primary/10 text-primary';

const isHrefActive = (pathname: string, href: string) => {
  if (!href) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function LayoutQuickNav({
  items,
  ariaLabel,
  className,
  listClassName,
  itemClassName = DEFAULT_ITEM_CLASS,
  defaultActiveClassName = DEFAULT_ACTIVE_CLASS,
}: LayoutQuickNavProps) {
  const { pathname } = useRouter();
  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) return null;

  return (
    <nav
      className={clsx('-mx-1 flex gap-2 overflow-x-auto pb-1', className)}
      aria-label={ariaLabel}
    >
      <div className={clsx('flex gap-2 px-1', listClassName)}>
        {visibleItems.map(({ href, label, activeClassName, isActive }) => {
          const active = isActive ? isActive(pathname) : isHrefActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(itemClassName, active && (activeClassName ?? defaultActiveClassName))}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default LayoutQuickNav;
