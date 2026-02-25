'use client';

import * as React from 'react';
import Link from 'next/link';
import Icon from '@/components/design-system/Icon';

export type Crumb = {
  href?: string;
  label: string;
};

type Props = {
  items: Crumb[];
};

export default function BreadcrumbMini({ items }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <Icon
                name="ChevronRight"
                className="h-3 w-3 text-muted-foreground"
              />
            )}

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate hover:text-foreground transition-colors max-w-[100px] sm:max-w-[150px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate max-w-[100px] sm:max-w-[150px] text-foreground">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
