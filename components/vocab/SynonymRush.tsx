import * as React from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { buildSynonymOptions, type SynonymOption } from '@/lib/vocabulary/ritual';
import type { WordOfDay } from '@/lib/vocabulary/today';

type SynonymResult = {
  score: number;
  accuracy: number;
  xpAwarded: number;
};

export type SynonymRushProps = Readonly<{
  word: WordOfDay | null;
  onComplete?: (result: SynonymResult) => void;
}>;

const createRoundState = (options: SynonymOption[] = []) => ({
  started: false,
  options,
  selections: new Set<string>(),
  result: null as SynonymResult | null,
});

export function SynonymRush({ word, onComplete }: SynonymRushProps) {
  const [state, setState] = React.useState(() => createRoundState());
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const startRef = React.useRef<number>(Date.now());
  const errorRef = React.useRef<HTMLDivElement | null>(null);
  const headingId = React.useId();
  const instructionsId = React.useId();
  const errorId = React.useId();

  const prepareRound = React.useCallback(
    (nextWord: WordOfDay | null) => {
      if (!nextWord) {
        setState(createRoundState());
        return;
      }
      const options = buildSynonymOptions(nextWord);
      setState(createRoundState(options));
      startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    },
    [],
  );

  React.useEffect(() => {
    prepareRound(word);
    setError(null);
  }, [prepareRound, word]);

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const hasOptions = state.options.length > 0;

  const toggleSelection = React.useCallback((optionId: string) => {
    setState((current) => {
      const selections = new Set(current.selections);
      if (selections.has(optionId)) {
        selections.delete(optionId);
      } else {
        selections.add(optionId);
      }
      return { ...current, selections, started: true };
    });
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!word) return;
    if (!hasOptions) {
      setError('We need at least one synonym to start the rush.');
      return;
    }

    const totalTargets = state.options.filter((option) => option.isCorrect).length;
    if (totalTargets === 0) {
      setError('Synonym rush will unlock once we add more data for this word.');
      return;
    }

    const selectedCorrect = state.options.filter(
      (option) => option.isCorrect && state.selections.has(option.id),
    ).length;
    const selectedIncorrect = state.options.filter(
      (option) => !option.isCorrect && state.selections.has(option.id),
    ).length;

    const netCorrect = Math.max(0, selectedCorrect - selectedIncorrect);
    const elapsed = Math.max(
      0,
      Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startRef.current),
    );

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/vocab/attempt/synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: word.id,
          total: totalTargets,
          correct: netCorrect,
          timeMs: elapsed,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sign in to record your streak and XP.');
        }
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to record your score.');
      }

      const payload = (await response.json()) as SynonymResult;
      setState((current) => ({ ...current, result: payload }));
      onComplete?.(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [hasOptions, onComplete, state.options, state.selections, word]);

  if (!word) {
    return (
      <Card className="p-6" aria-live="polite">
        <div className="space-y-3">
          <h2 className="text-h4 font-semibold text-foreground">Synonym rush</h2>
          <p className="text-body text-mutedText">Come back once today&apos;s word is live to play the speed round.</p>
        </div>
      </Card>
    );
  }

  if (!hasOptions) {
    return (
      <Card className="p-6" aria-live="polite">
        <div className="space-y-3">
          <h2 className="text-h4 font-semibold text-foreground">Synonym rush</h2>
          <p className="text-body text-mutedText">
            We&apos;re still gathering synonym data for <strong>{word.headword}</strong>. Check back soon!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="text-h4 font-semibold text-foreground">
              Synonym rush
            </h2>
            <p className="text-body text-mutedText">
              Select every option that matches <strong>{word.headword}</strong>. Wrong picks subtract from your score.
            </p>
          </div>
          {state.result ? (
            <span aria-live="polite">
              <Badge variant="info" size="sm">
                Score {state.result.score} · +{state.result.xpAwarded} XP
              </Badge>
            </span>
          ) : null}
        </header>

        <p id={instructionsId} className="text-caption text-mutedText">
          Toggle every synonym that fits. Press submit when you are ready.
        </p>

        <div
          className="grid gap-3 sm:grid-cols-2"
          role="group"
          aria-labelledby={headingId}
          aria-describedby={[instructionsId, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        >
          {state.options.map((option) => {
            const active = state.selections.has(option.id);
            const showOutcome = Boolean(state.result);
            const correct = option.isCorrect;
            const srLabel = showOutcome
              ? correct
                ? 'Marked as correct synonym'
                : 'Marked as incorrect option'
              : active
                ? 'Selected'
                : 'Not selected';
            const statusId = `synonym-status-${option.id}`;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleSelection(option.id)}
                className={[
                  'rounded-2xl border border-border/80 bg-surface px-4 py-3 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active && !showOutcome ? 'border-primary/70 bg-primary/5' : '',
                  showOutcome && active && correct ? 'border-success/70 bg-success/5' : '',
                  showOutcome && active && !correct ? 'border-danger/70 bg-danger/5' : '',
                  showOutcome && !active && correct ? 'border-success/40' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={active}
                aria-describedby={statusId}
              >
                <span className="font-semibold text-foreground capitalize">{option.text}</span>
                <span id={statusId} className="sr-only">
                  {srLabel}
                </span>
              </button>
            );
          })}
        </div>

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

        {state.result ? (
          <p className="text-small text-mutedText" aria-live="polite">
            Accuracy {(state.result.accuracy * 100).toFixed(0)}% · Try to beat {state.result.score} next time!
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="soft"
            tone="primary"
            loading={submitting}
            loadingText="Submitting"
            disabled={submitting}
            onClick={() => {
              if (!state.started) {
                startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
              }
              void handleSubmit();
            }}
          >
            {state.result ? 'Play again' : 'Submit selections'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (!word) return;
              const options = buildSynonymOptions(word);
              setState(createRoundState(options));
              setError(null);
              startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
            }}
          >
            Shuffle choices
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default SynonymRush;
