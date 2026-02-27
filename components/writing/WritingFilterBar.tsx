// components/writing/WritingFilterBar.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

const KIND_VALUES = ['task1-graph', 'task1-letter', 'task2-opinion', 'task2-discuss', 'task2-advantages', 'task2-problem'] as const;
type Kind = (typeof KIND_VALUES)[number];

const KIND_LABELS: Record<Kind, string> = {
  'task1-graph': 'Task 1: Graphs/Charts',
  'task1-letter': 'Task 1: Letters',
  'task2-opinion': 'Task 2: Opinion',
  'task2-discuss': 'Task 2: Discuss Both Views',
  'task2-advantages': 'Task 2: Advantages/Disadvantages',
  'task2-problem': 'Task 2: Problem/Solution',
};

function normaliseFilter(v: unknown): 'all' | Kind {
  if (typeof v !== 'string') return 'all';
  const s = v.toLowerCase();
  if (s === 'all') return 'all';
  for (const kind of KIND_VALUES) {
    if (s === kind || s.startsWith(kind.split('-')[1])) return kind;
  }
  return 'all';
}

export function WritingFilterBar() {
  const router = useRouter();
  const activeType = normaliseFilter(router.query.type);

  const filters = [
    { key: 'all' as const, label: 'All Tasks', icon: 'List' },
    ...KIND_VALUES.map((kind) => ({
      key: kind,
      label: KIND_LABELS[kind],
      icon: kind.startsWith('task1-') ? 'BarChart3' : 'Edit3',
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {filters.map(({ key, label, icon }) => (
        <Link
          key={key}
          href={{
            pathname: router.pathname,
            query: key === 'all' ? {} : { type: key },
          }}
          className="transition-colors"
          shallow
        >
          <Button
            variant={activeType === key ? 'primary' : 'surface'}
            size="sm"
            className="rounded-ds-xl flex items-center gap-1.5"
          >
            <Icon name={icon} size={14} />
            <span className="text-xs">{label}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
}