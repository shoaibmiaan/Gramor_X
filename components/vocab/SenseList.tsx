import * as React from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Heading } from '@/components/design-system/Heading';
import { Separator } from '@/components/design-system/Separator';
import type { WordSense } from '@/types/vocabulary';

export interface SenseListProps {
  senses: WordSense[];
}

export const SenseList: React.FC<SenseListProps> = ({ senses }) => {
  if (!senses || senses.length === 0) {
    return <p className="text-small text-muted-foreground">No senses have been recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {senses.map((sense, index) => (
        <React.Fragment key={sense.id ?? `${sense.definition}-${index}`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Heading as="h3" size="sm" className="text-foreground">
                  {index + 1}. {sense.definition}
                </Heading>
                {sense.usageNotes && (
                  <p className="text-small text-muted-foreground">{sense.usageNotes}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sense.partOfSpeech && <Badge variant="neutral">{sense.partOfSpeech}</Badge>}
                {sense.level && <Badge variant="info">{sense.level}</Badge>}
                {sense.register && <Badge variant="secondary">{sense.register}</Badge>}
              </div>
            </div>

            {sense.examples && sense.examples.length > 0 && (
              <div className="space-y-2 rounded-ds-xl border border-border/60 bg-card/60 p-4">
                <p className="text-caption font-semibold text-muted-foreground">Examples</p>
                <ul className="list-disc space-y-2 pl-5 text-small text-foreground/80">
                  {sense.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </div>
            )}

            {sense.synonyms && sense.synonyms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-small">
                <span className="font-medium text-muted-foreground">Synonyms:</span>
                {sense.synonyms.map((synonym) => (
                  <Badge key={synonym} variant="subtle" size="xs">
                    {synonym}
                  </Badge>
                ))}
              </div>
            )}

            {sense.antonyms && sense.antonyms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-small">
                <span className="font-medium text-muted-foreground">Antonyms:</span>
                {sense.antonyms.map((antonym) => (
                  <Badge key={antonym} variant="subtle" size="xs">
                    {antonym}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {index !== senses.length - 1 && <Separator className="bg-border" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SenseList;
