import Link from 'next/link';
import * as React from 'react';
import { ArrowRight, Sparkles, Target, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Heading } from '@/components/design-system/Heading';
import { Skeleton } from '@/components/design-system/Skeleton';
import type { VocabularyHighlights } from '@/types/vocabulary';

interface VocabularyHighlightsPanelProps {
  highlights: VocabularyHighlights | null;
  isLoading?: boolean;
}

const HighlightsSkeleton: React.FC = () => (
  <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
    <Card padding="lg">
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-36" />
      </div>
    </Card>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <Card padding="lg">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
      <Card padding="lg">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </Card>
    </div>
  </div>
);

export const VocabularyHighlightsPanel: React.FC<VocabularyHighlightsPanelProps> = ({
  highlights,
  isLoading = false,
}) => {
  if (isLoading && !highlights) {
    return <HighlightsSkeleton />;
  }

  if (!highlights) {
    return null;
  }

  const { wordOfTheDay, trendingWords, topCategories, recommendedDailyGoal, studyTip, totalWords, uniqueCategories } =
    highlights;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card padding="lg" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" aria-hidden="true" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent" size="sm" className="uppercase tracking-wide">
              Word of the day
            </Badge>
            {wordOfTheDay.frequencyBand && (
              <Badge variant="info" size="sm">
                {wordOfTheDay.frequencyBand}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <Heading as="h2" size="lg">
              {wordOfTheDay.headword}
            </Heading>
            <Badge variant="neutral">{wordOfTheDay.partOfSpeech}</Badge>
            {wordOfTheDay.level && <Badge variant="info">{wordOfTheDay.level}</Badge>}
          </div>

          {wordOfTheDay.shortDefinition && (
            <p className="text-body text-muted-foreground">{wordOfTheDay.shortDefinition}</p>
          )}

          {wordOfTheDay.example && (
            <blockquote className="rounded-xl border border-border/60 bg-background/60 p-4 text-small text-muted-foreground">
              “{wordOfTheDay.example}”
            </blockquote>
          )}

          <p className="text-small font-medium text-foreground/80">{wordOfTheDay.learningHook}</p>

          <div className="flex flex-wrap items-center gap-2">
            {wordOfTheDay.categories.map((category) => (
              <Badge key={category} variant="secondary" size="sm">
                {category}
              </Badge>
            ))}
          </div>

          <Button asChild variant="soft" tone="primary" size="lg" className="mt-2 w-fit">
            <Link href={`/vocabulary/${wordOfTheDay.slug}`} className="inline-flex items-center gap-2">
              Study “{wordOfTheDay.headword}”
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <Heading as="h3" size="sm">
                Stay on track
              </Heading>
              <p className="text-small text-muted-foreground">{studyTip}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-small text-muted-foreground">
            <Badge variant="primary" size="md" className="font-semibold">
              {recommendedDailyGoal} words / day
            </Badge>
            <Badge variant="neutral" size="md">
              {totalWords} total words
            </Badge>
            <Badge variant="secondary" size="md">
              {uniqueCategories} topic tracks
            </Badge>
          </div>
        </Card>

        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-electricBlue/10 p-2 text-electricBlue">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <Heading as="h3" size="sm">
                Trending for IELTS
              </Heading>
              <p className="text-small text-muted-foreground">
                Spark ideas with vocabulary other students are revising right now.
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {trendingWords.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-small">
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{item.headword}</span>
                  <div className="flex flex-wrap gap-2 text-muted-foreground">
                    <span className="capitalize">{item.partOfSpeech}</span>
                    {item.level && <span>• Level {item.level}</span>}
                    <span>• {item.momentum === 'rising' ? '🔥 Rising' : item.momentum === 'steady' ? '⭐ Steady' : '✨ New'}</span>
                  </div>
                </div>
                <Button asChild variant="link" size="sm" className="text-primary">
                  <Link href={`/vocabulary/${item.slug}`} className="inline-flex items-center gap-1">
                    Explore
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          {topCategories.length > 0 && (
            <div className="rounded-xl bg-muted/60 p-3 text-small text-muted-foreground">
              <span className="font-medium text-foreground">Hot tracks:</span>{' '}
              {topCategories.map((category, index) => (
                <React.Fragment key={category.name}>
                  {index > 0 && <span>, </span>}
                  <span>
                    {category.name}
                    {typeof category.count === 'number' && category.count > 0 && (
                      <span className="text-muted-foreground/70"> ({category.count})</span>
                    )}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VocabularyHighlightsPanel;
