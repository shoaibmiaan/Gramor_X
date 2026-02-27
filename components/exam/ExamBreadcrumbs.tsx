// components/exam/ExamBreadcrumbs.tsx
import * as React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/design-system/Icon';

export type ExamBreadcrumbItem = {
  label: string;
  href?: string;
  active?: boolean;
};

type Props = {
  items: ExamBreadcrumbItem[];
  className?: string;
};

export const ExamBreadcrumbs: React.FC<Props> = ({ items, className }) => {
  if (!items?.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={
        'flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground ' +
        (className ?? '')
      }
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const content = (
          <span
            className={
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ' +
              (item.active || isLast
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted/70')
            }
          >
            {idx === 0 && (
              <Icon name="home" className="h-3 w-3 opacity-80" />
            )}
            <span className="truncate max-w-[120px]">{item.label}</span>
          </span>
        );

        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && (
              <Icon
                name="chevron-right"
                className="h-3 w-3 text-muted-foreground/70"
              />
            )}
            {item.href && !isLast ? (
              <Link href={item.href}>{content}</Link>
            ) : (
              content
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
