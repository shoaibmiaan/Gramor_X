import * as React from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Textarea } from '@/components/design-system/Textarea';
import { Input } from '@/components/design-system/Input';
import type { WordOfDay } from '@/lib/vocabulary/today';

type SentenceResult = {
  score: 1 | 2 | 3;
  feedback: string;
  xpAwarded: number;
};

export type SentencePracticeProps = Readonly<{
  word: WordOfDay | null;
  onComplete?: (result: SentenceResult) => void;
}>;

const scoreCopy: Record<SentenceResult['score'], string> = {
  1: 'Keep refining',
  2: 'Solid attempt',
  3: 'Band-ready! 🎉',
};

export function SentencePractice({ word, onComplete }: SentencePracticeProps) {
  const [sentence, setSentence] = React.useState('');
  const [context, setContext] = React.useState('');
  const [result, setResult] = React.useState<SentenceResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const startRef = React.useRef<number>(Date.now());
  const mountedRef = React.useRef(true);
  const errorRef = React.useRef<HTMLDivElement | null>(null);
  const errorId = React.useId();

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!word) {
      setSentence('');
      setContext('');
      setResult(null);
      setError(null);
      return;
    }

    setSentence('');
    setContext('');
    setResult(null);
    setError(null);
    startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, [word]);

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!word || !sentence.trim()) {
        setError('Write a complete sentence before submitting.');
        return;
      }

      setSubmitting(true);
      setError(null);
      const elapsed = Math.max(
        0,
        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startRef.current),
      );

      try {
        const response = await fetch('/api/vocab/attempt/sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordId: word.id,
            sentence: sentence.trim(),
            timeMs: elapsed,
            context: context.trim() || undefined,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Sign in to receive AI feedback and XP.');
          }
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Could not evaluate your sentence.');
        }

        const payload = (await response.json()) as SentenceResult;
        if (!mountedRef.current) return;
        setResult(payload);
        onComplete?.(payload);
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setError(message);
      } finally {
        if (mountedRef.current) {
          setSubmitting(false);
        }
      }
    },
    [context, onComplete, sentence, word],
  );

  if (!word) {
    return (
      <Card className="p-6" aria-live="polite">
        <div className="space-y-3">
          <h2 className="text-h4 font-semibold text-foreground">Sentence practice</h2>
          <p className="text-body text-mutedText">
            We&apos;ll unlock AI feedback once today&apos;s word is published.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-h4 font-semibold text-foreground">Sentence practice</h2>
            <p className="text-body text-mutedText">
              Write a sentence using <strong>{word.headword}</strong>. The coach scores clarity and natural usage.
            </p>
          </div>
          {result ? (
            <span aria-live="polite">
              <Badge variant={result.score >= 3 ? 'success' : result.score === 2 ? 'info' : 'warning'} size="sm">
                {scoreCopy[result.score]} · +{result.xpAwarded} XP
              </Badge>
            </span>
          ) : null}
        </header>

        <label className="flex flex-col gap-2">
          <span className="text-small font-medium text-mutedText">Your sentence</span>
          <Textarea
            value={sentence}
            onChange={(event) => setSentence(event.target.value)}
            minRows={3}
            maxLength={500}
            placeholder={`Example: The ${word.headword.toLowerCase()} tone impressed the examiner.`}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-small font-medium text-mutedText">Context (optional)</span>
          <Input
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Tell the coach where you might use this sentence."
            maxLength={200}
          />
        </label>

        {result ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3" aria-live="polite">
            <p className="text-body text-foreground">{result.feedback}</p>
          </div>
        ) : null}

        {error ? (
          <div
            id={errorId}
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-warning"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="soft"
            tone="primary"
            loading={submitting}
            loadingText="Scoring"
            disabled={submitting}
          >
            {result ? 'Score again' : 'Get AI feedback'}
          </Button>
          {result ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResult(null);
                setSentence('');
                setContext('');
                setError(null);
                startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
              }}
            >
              Reset draft
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export default SentencePractice;
