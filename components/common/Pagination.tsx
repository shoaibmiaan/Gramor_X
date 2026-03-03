import React from 'react';

type PaginationProps = {
  page: number;
  max: number;
  onPage: (page: number) => void;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Pagination({ page, max, onPage, className }: PaginationProps) {
  if (max <= 1) return null;

  const pages = Array.from({ length: max }, (_, index) => index + 1);

  return (
    <div className={cx('mt-6 flex flex-wrap items-center gap-2', className)}>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={cx(
            'rounded-lg border border-border px-3 py-1',
            p === page ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-lightBg',
          )}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
