import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import type { MistakeTag } from '@/lib/mistakes';

export type Mistake = {
  id: string;
  prompt: string;
  correction: string | null;
  skill: string;
  repetitions: number;
  nextReview: string | null;
  createdAt: string;
  lastSeenAt: string;
  retryPath: string | null;
  tags?: MistakeTag[];
};

export type MistakeCardProps = {
  mistake: Mistake;
  onReview: (mistake: Mistake) => void;
  onResolve: (id: string) => void;
};

export const MistakeCard: React.FC<MistakeCardProps> = ({ mistake, onReview, onResolve }) => {
  const dueLabel = formatDate(mistake.nextReview ?? null);
  const lastSeenLabel = formatDate(mistake.lastSeenAt);

  return (
    <Card className="rounded-ds-2xl p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="font-medium text-body text-foreground">{mistake.prompt}</h3>
          {mistake.correction && (
            <p className="text-small text-muted-foreground">
              <span className="font-medium text-foreground/80">Correction:</span> {mistake.correction}
            </p>
          )}
        </div>
        <Badge variant="info" className="uppercase tracking-wide">
          {formatSkill(mistake.skill)}
        </Badge>
      </header>

      {mistake.tags && mistake.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {mistake.tags.map((tag) => (
            <span
              key={`${mistake.id}-${tag.key}-${tag.value}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-caption text-muted-foreground"
            >
              <span className="font-medium text-foreground/70">{tag.key}:</span>
              <span>{tag.value}</span>
            </span>
          ))}
        </div>
      )}

      <dl className="mt-4 grid gap-3 text-caption text-muted-foreground sm:grid-cols-3">
        <div>
          <dt className="font-medium text-foreground/70">Next review</dt>
          <dd>{dueLabel}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Last seen</dt>
          <dd>{lastSeenLabel}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Repetitions</dt>
          <dd>{mistake.repetitions}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {mistake.retryPath && (
          <Button variant="soft" tone="primary" size="sm" asChild>
            <Link href={mistake.retryPath}>Retry exercise</Link>
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => onReview(mistake)}>
          Mark reviewed
        </Button>
        <Button size="sm" variant="outline" onClick={() => onResolve(mistake.id)}>
          Mark resolved
        </Button>
      </div>
    </Card>
  );
};

function formatDate(value: string | null): string {
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatSkill(skill: string): string {
  return skill
    .split(/[\s_\-|]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default MistakeCard;
