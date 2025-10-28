import { useCallback, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import type { ParaphraseOption } from '@/lib/writing/languageTools';

export type ParaphraseStudioProps = {
  onInsert?: (sentence: string) => void;
};

export const ParaphraseStudio = ({ onInsert }: ParaphraseStudioProps) => {
  const [sentence, setSentence] = useState('');
  const [options, setOptions] = useState<ParaphraseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runParaphrase = useCallback(async () => {
    if (!sentence.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/writing/paraphrase/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to generate paraphrases');
      }
      const payload = (await response.json()) as { options: ParaphraseOption[] };
      setOptions(payload.options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate paraphrases');
    } finally {
      setLoading(false);
    }
  }, [sentence]);

  const handleInsert = (value: string) => {
    if (!onInsert) return;
    onInsert(value);
  };

  return (
    <Card className="space-y-4" padding="lg">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Paraphrase studio</h2>
        <p className="text-sm text-muted-foreground">Drop in a sentence to explore confident, exam-ready rewrites.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Input
          value={sentence}
          onChange={(event) => setSentence(event.target.value)}
          placeholder="Paste the sentence you want to paraphrase"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={runParaphrase} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" aria-hidden />
                Generating…
              </span>
            ) : (
              'Generate paraphrases'
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSentence('')} disabled={loading}>
            Clear
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {options.length > 0 && (
        <ul className="space-y-3">
          {options.map((option) => (
            <li key={`${option.tone}-${option.sentence}`} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="soft" tone="info" size="sm" className="capitalize">
                  {option.tone}
                </Badge>
                {onInsert && (
                  <Button size="xs" variant="ghost" onClick={() => handleInsert(option.sentence)}>
                    Insert
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm text-foreground">{option.sentence}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
