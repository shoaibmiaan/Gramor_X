import * as React from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Radio } from '@/components/design-system/Radio';
import { Badge } from '@/components/design-system/Badge';
import type { WordOfDay } from '@/lib/vocabulary/today';
import { buildMeaningOptions, type MeaningOption } from '@/lib/vocabulary/ritual';

type AttemptResult = {
  correct: boolean;
  xpAwarded: number;
};

export type MeaningQuizProps = Readonly<{
  word: WordOfDay | null;
  onComplete?: (result: AttemptResult) => void;
}>;

const createInitialState = (options: MeaningOption[] = []) => ({
  selected: '',
  options,
  result: null as AttemptResult | null,
});

export function MeaningQuiz({ word, onComplete }: MeaningQuizProps) {
  const [state, setState] = React.useState(() => createInitialState());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const startRef = React.useRef<number>(Date.now());
  const errorRef = React.useRef<HTMLDivElement | null>(null);
  const hintId = React.useId();
  const errorId = React.useId();

  React.useEffect(() => {
    if (!word) {
      setState(createInitialState());
      setError(null);
      return;
    }

    const options = buildMeaningOptions(word);
    setState(createInitialState(options));
    setError(null);
    startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, [word]);

  const selectedOption = React.useMemo(
    () => state.options.find((option) => option.id === state.selected) ?? null,
    [state.options, state.selected],
  );

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!word) return;
      if (!selectedOption) {
        setError('Please choose the meaning that best matches the word.');
        return;
      }

      setSubmitting(true);
      setError(null);
      const elapsed = Math.max(
        0,
        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startRef.current),
      );

      try {
        const response = await fetch('/api/vocab/attempt/meaning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordId: word.id,
            choice: selectedOption.text,
            timeMs: elapsed,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please sign in to record your progress.');
          }
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Unable to submit your answer.');
        }

        const payload = (await response.json()) as AttemptResult;
        setState((current) => ({ ...current, result: payload }));
        onComplete?.(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [onComplete, selectedOption, word],
  );

  if (!word) {
    return (
      <Card className="p-6" aria-live="polite">
        <div className="space-y-3">
          <h2 className="text-h4 font-semibold text-foreground">Meaning quiz</h2>
          <p className="text-body text-mutedText">We&apos;ll unlock the quiz once today&apos;s word is ready.</p>
        </div>
      </Card>
    );
  }

  if (!state.options.length) {
    return (
      <Card className="p-6" aria-live="polite">
        <div className="space-y-3">
          <h2 className="text-h4 font-semibold text-foreground">Meaning quiz</h2>
          <p className="text-body text-mutedText">
            This word doesn&apos;t have alternative meanings yet. We&apos;ll add challenge items soon.
          </p>
        </div>
      </Card>
    );
  }

  const isAnswered = Boolean(state.result);
  const correct = state.result?.correct ?? false;

  return (
    <Card className="p-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-h4 font-semibold text-foreground">Meaning quiz</h2>
            <p className="text-body text-mutedText">
              Pick the definition that matches <strong>{word.headword}</strong>.
            </p>
          </div>
          {isAnswered ? (
            <span aria-live="polite">
              <Badge variant={correct ? 'success' : 'danger'} size="sm">
                {correct ? `+${state.result?.xpAwarded ?? 0} XP` : 'Try again'}
              </Badge>
            </span>
          ) : null}
        </header>

        <fieldset
          className="space-y-3"
          aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          aria-invalid={Boolean(error)}
          aria-errormessage={error ? errorId : undefined}
        >
          <legend className="sr-only">Choose the best meaning</legend>
          {state.options.map((option) => {
            const isSelected = state.selected === option.id;
            const showStatus = isAnswered && isSelected;
            return (
              <Radio
                key={option.id}
                name="meaning-option"
                label={option.text}
                checked={isSelected}
                onChange={() => setState((current) => ({ ...current, selected: option.id }))}
                disabled={submitting}
                className={[
                  'rounded-2xl border border-border/80 bg-surface px-4 py-3 transition-colors',
                  isSelected && !isAnswered ? 'border-primary/70 bg-primary/5' : '',
                  showStatus && option.isCorrect ? 'border-success/70 bg-success/5' : '',
                  showStatus && !option.isCorrect ? 'border-danger/70 bg-danger/5' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                description={showStatus ? (option.isCorrect ? 'Correct answer' : 'Not quite right') : undefined}
              />
            );
          })}
          <p id={hintId} className="text-caption text-mutedText">
            Use the arrow keys to move between options, then press space to select.
          </p>
        </fieldset>

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
            loadingText="Checking"
            disabled={submitting}
          >
            {isAnswered ? 'Check again' : 'Check answer'}
          </Button>
          {isAnswered && !correct ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!word) return;
                const options = buildMeaningOptions(word);
                setState(createInitialState(options));
                setError(null);
                startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
              }}
            >
              Try a new set
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export default MeaningQuiz;
