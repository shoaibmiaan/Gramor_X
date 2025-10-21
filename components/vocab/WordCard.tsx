import Link from 'next/link';
import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import type { WordSummary } from '@/types/vocabulary';

export interface WordCardProps {
  entry: WordSummary;
}

export const WordCard: React.FC<WordCardProps> = ({ entry }) => {
  const href = `/vocabulary/${entry.slug}`;

  return (
    <Card as="article" interactive padding="lg" className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={href}
            className="text-h3 font-semibold text-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
          >
            {entry.headword}
          </Link>
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
        <Button
          as={Link as any}
          href={href}
          variant="ghost"
          size="sm"
          trailingIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
        >
          View details
        </Button>
      </div>
    </Card>
  );
};

export default WordCard;
