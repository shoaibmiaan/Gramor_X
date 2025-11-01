import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

export type LayoutQuickNavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
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

const DEFAULT_ITEM_CLASS =
  'nav-pill group shrink-0 whitespace-nowrap border border-border/40 bg-background/75 px-4 py-2 text-sm font-medium text-mutedText/90 shadow-sm backdrop-blur-sm transition hover:border-border/60 hover:text-foreground';
const DEFAULT_ACTIVE_CLASS =
  'is-active border-transparent bg-primary/15 text-primary ring-1 ring-primary/30 shadow-md';

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
      className={clsx('relative -mx-1 overflow-x-auto pb-1', className)}
      aria-label={ariaLabel}
    >
      <div className={clsx('flex min-w-max gap-2 px-1 py-1', listClassName)}>
        {visibleItems.map(({ href, label, icon, activeClassName, isActive }) => {
          const active = isActive ? isActive(pathname) : isHrefActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                itemClassName,
                active && (activeClassName ?? defaultActiveClassName)
              )}
            >
              <span className="inline-flex items-center gap-2">
                {icon ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center text-current opacity-80">
                    {React.isValidElement(icon)
                      ? React.cloneElement(icon, {
                          className: clsx('h-4 w-4', icon.props?.className),
                        })
                      : icon}
                  </span>
                ) : null}
                <span>{label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default LayoutQuickNav;
