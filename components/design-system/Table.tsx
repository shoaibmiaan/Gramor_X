import * as React from 'react';
import { cx } from './_core/types';

type TableElementProps<T extends HTMLElement> = React.HTMLAttributes<T> & { children?: React.ReactNode };

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;

export function Table({ className, ...props }: TableProps) {
  return (
    <table
      className={cx(
        'w-full border-collapse text-small text-text',
        'rounded-ds-2xl overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: TableElementProps<HTMLTableSectionElement>) {
  return (
    <thead
      className={cx('bg-panel/70 text-caption text-muted uppercase tracking-wide', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: TableElementProps<HTMLTableSectionElement>) {
  return <tbody className={cx('divide-y divide-border/60', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cx(
        'transition-colors even:bg-panel/40 hover:bg-panel/60 focus-within:bg-panel/60',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx('px-md py-sm text-left font-medium text-text', className)}
      scope="col"
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx('px-md py-sm align-middle text-muted', className)} {...props} />;
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <caption
      className={cx('px-md py-sm text-caption text-muted', className)}
      {...props}
    />
  );
}

export const TableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function TableContainer(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx('overflow-auto rounded-ds-2xl border border-border/60 bg-card', className)}
      {...props}
    >
      {children}
    </div>
  );
});

