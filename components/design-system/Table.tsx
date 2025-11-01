import * as React from 'react';
import { cx } from './_core/types';

type BaseProps<T> = React.HTMLAttributes<T> & { className?: string };

type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  wrapClassName?: string;
};

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, wrapClassName, children, ...props }, ref) => {
    return (
      <div className={cx('overflow-x-auto rounded-ds-2xl border border-border/70 bg-panel shadow-sm', wrapClassName)}>
        <table
          ref={ref}
          className={cx(
            'w-full min-w-[40rem] text-left text-small text-muted',
            '[&_thead]:bg-panel/60 [&_thead_th]:text-text [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wide',
            '[&_tbody_tr]:border-t [&_tbody_tr]:border-border/60',
            '[&_tbody_tr:hover]:bg-panel/80',
            '[&_th]:px-md [&_th]:py-sm [&_td]:px-md [&_td]:py-sm',
            className
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, BaseProps<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cx('bg-panel/80 text-text', className)} {...props} />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, BaseProps<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cx('divide-y divide-border/60', className)} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, BaseProps<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cx('transition-colors hover:bg-panel/70', className)} {...props} />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, BaseProps<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cx('px-md py-xs text-xs font-semibold uppercase tracking-wide text-muted', className)}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, BaseProps<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cx('px-md py-sm align-middle text-small text-text', className)} {...props} />
  )
);
TableCell.displayName = 'TableCell';

export default Table;
