import Link from 'next/link';
import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';

import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import type { WordSummary } from '@/types/vocabulary';

export interface WordCardProps {
  entry: WordSummary;
}

export const WordCard: React.FC<WordCardProps> = ({ entry }) => {
  const href = `/vocabulary/${entry.slug}`;

  return (
    <Link
      href={href}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        as="article"
        interactive
        padding="lg"
        className="flex h-full flex-col gap-4 transition-[border,box-shadow] group-hover:border-primary/50 group-hover:shadow-md group-focus-visible:border-primary/60 group-focus-visible:shadow-md"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-h3 font-semibold text-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary">
              {entry.headword}
            </span>
            <Badge variant="neutral">{entry.partOfSpeech}</Badge>
            {entry.level && entry.level !== 'all' && <Badge variant="info">{entry.level}</Badge>}
          </div>

          {entry.shortDefinition && (
            <p className="text-small text-muted-foreground">{entry.shortDefinition}</p>
          )}

          {entry.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.categories.map((category) => (
                <Badge key={category} variant="subtle" size="sm">
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <span>Frequency</span>
            <Badge variant="secondary" size="sm">
              {entry.frequencyScore ?? '—'}
            </Badge>
          </div>
          <span className="inline-flex items-center gap-1 text-small font-medium text-primary transition-colors group-hover:text-primary/80 group-focus-visible:text-primary/80">
            View details
            <ArrowUpRight
              className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </Card>
    </Link>
  );
};

export default WordCard;
