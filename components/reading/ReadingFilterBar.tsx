import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';

const TYPES = [
  { key: 'all', label: 'All' },
  { key: 'tfng', label: 'True/False/Not Given' },
  { key: 'mcq', label: 'MCQ' },
  { key: 'matching', label: 'Matching' },
  { key: 'short', label: 'Short Answer' },
];

export const ReadingFilterBar: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const router = useRouter();
  const active = (router.query.type as string) || 'all';

  const setType = (t: string) => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, type: t } },
      undefined,
      { shallow: true },
    );
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-ds bg-muted/40 px-2 py-1.5 ${className}`}
      aria-label="Filter reading tests by question type"
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mr-1.5">
        Focus type
      </span>
      {TYPES.map((t) => (
        <Button
          key={t.key}
          onClick={() => setType(t.key)}
          variant={active === t.key ? 'primary' : 'secondary'}
          size="xs"
          className="rounded-ds px-2.5 text-[11px]"
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
};
