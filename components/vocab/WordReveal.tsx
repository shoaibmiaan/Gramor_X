import * as React from 'react';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import type { WordOfDay } from '@/lib/vocabulary/today';
import { track } from '@/lib/analytics/track';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

type WordRevealProps = Readonly<{
  date?: string;
  word: WordOfDay | null;
  source?: 'rpc' | 'view';
  isLoading?: boolean;
}>;

function renderSynonyms(list: string[]) {
  if (!list || list.length === 0) return null;
  const items = list.slice(0, 6);
  return (
    <div className="flex flex-wrap gap-2" aria-label="Common synonyms">
      {items.map((synonym) => (
        <Badge key={synonym} variant="neutral" size="sm" className="capitalize">
          {synonym}
        </Badge>
      ))}
    </div>
  );
}

function renderMetadata(word: WordOfDay) {
  const parts: Array<{ label: string; value: string | null }> = [
    { label: 'Part of speech', value: word.partOfSpeech ?? null },
    { label: 'Register', value: word.register ?? null },
    { label: 'Level', value: word.cefr ?? null },
    { label: 'Topics', value: word.topics?.join(', ') ?? null },
  ];

  const filtered = parts.filter((item) => item.value);
  if (filtered.length === 0) return null;

  return (
    <dl className="grid gap-2 sm:grid-cols-2" aria-label="Word metadata">
      {filtered.map((item) => (
        <div key={item.label} className="rounded-lg border border-border/60 bg-surface px-3 py-2">
          <dt className="text-caption text-muted">{item.label}</dt>
          <dd className="text-body font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WordReveal({ date, word, source, isLoading }: WordRevealProps) {
  const formattedDate = React.useMemo(() => {
    if (!date) return '';
    try {
      return dateFormatter.format(new Date(`${date}T00:00:00Z`));
    } catch {
      return date;
    }
  }, [date]);

  React.useEffect(() => {
    if (!word) return;
    track('vocab_word_viewed', { wordId: word.id, source: source ?? 'unknown' });
  }, [word?.id, source]);

  if (isLoading) {
    return (
      <Card className="animate-pulse" aria-busy>
        <div className="flex flex-col gap-6">
          <div className="h-4 w-40 rounded-full bg-muted/40" />
          <div className="space-y-2">
            <div className="h-10 w-2/3 rounded-full bg-muted/50" />
            <div className="h-4 w-full rounded-full bg-muted/40" />
            <div className="h-4 w-5/6 rounded-full bg-muted/30" />
          </div>
          <div className="h-4 w-1/2 rounded-full bg-muted/40" />
        </div>
      </Card>
    );
  }

  if (!word) {
    return (
      <Card className="p-6" role="status" aria-live="polite">
        <p className="text-body text-mutedText">
          No word of the day is scheduled yet. Check back soon!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6" role="article" aria-live="polite">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="text-caption text-mutedText">
            Word of the day{formattedDate ? ` · ${formattedDate}` : ''}
          </span>
          <div>
            <h1 className="text-display font-semibold tracking-tight text-foreground">
              {word.headword}
            </h1>
            {word.ipa ? (
              <p className="text-caption text-mutedText" aria-label="Phonetic transcription">
                {word.ipa}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {word.partOfSpeech ? (
              <Badge variant="info" size="sm" aria-label="Part of speech">
                {word.partOfSpeech}
              </Badge>
            ) : null}
            {word.cefr ? (
              <Badge variant="success" size="sm" aria-label="CEFR level">
                {word.cefr}
              </Badge>
            ) : null}
            {source === 'view' ? (
              <Badge variant="neutral" size="sm">
                Cached
              </Badge>
            ) : null}
          </div>
        </header>

        <section aria-label="Definition" className="space-y-3">
          <p className="text-large font-medium text-foreground">
            {word.meaning || word.definition}
          </p>
          {word.example ? (
            <blockquote className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 text-body italic text-foreground/90">
              {word.example}
            </blockquote>
          ) : null}
          {word.exampleTranslation ? (
            <p className="text-caption text-mutedText">{word.exampleTranslation}</p>
          ) : null}
        </section>

        {renderSynonyms(word.synonyms)}

        {renderMetadata(word)}
      </div>
    </Card>
  );
}

export default WordReveal;
