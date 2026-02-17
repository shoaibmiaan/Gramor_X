// components/reading/ReadingQuestionItem.tsx
import * as React from 'react';

import type { ReadingQuestion } from '@/lib/reading/types';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

type AnswerValue = string | string[] | Record<string, unknown> | null;

type ReadingQuestionItemProps = {
  question: ReadingQuestion;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
};

export type QuestionKind =
  | 'tfng'
  | 'yynn'
  | 'mcq'
  | 'gap'
  | 'match'
  | 'short'
  | 'other';

const TFNG_OPTIONS = ['True', 'False', 'Not Given'];
const YYNN_OPTIONS = ['Yes', 'No', 'Not Given'];

export function getQuestionKind(q: ReadingQuestion): QuestionKind {
  const id = String((q as any).questionTypeId ?? '').toLowerCase();

  if (id === 'tfng' || id === 'true_false_not_given') return 'tfng';
  if (id === 'yynn' || id === 'yes_no_not_given') return 'yynn';
  if (id.startsWith('mcq') || id.includes('choice')) return 'mcq';
  if (id.includes('gap') || id.includes('blank') || id.includes('summary'))
    return 'gap';
  if (id.includes('match')) return 'match';
  if (
    id === 'short_answer' ||
    id === 'sentence_completion' ||
    id === 'summary_completion'
  ) {
    return 'short';
  }

  return 'other';
}

function getMcqOptions(q: ReadingQuestion): string[] {
  const rawConstraints = (q as any).constraintsJson as
    | { options?: string[]; labels?: string[] }
    | undefined;

  if (rawConstraints) {
    if (Array.isArray(rawConstraints.options)) {
      return rawConstraints.options.map(String);
    }
    if (Array.isArray(rawConstraints.labels)) {
      return rawConstraints.labels.map(String);
    }
  }

  return [];
}

export const ReadingQuestionItem: React.FC<ReadingQuestionItemProps> = ({
  question,
  value,
  onChange,
  isFlagged = false,
  onToggleFlag,
}) => {
  const kind = getQuestionKind(question);

  const currentTextValue =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
      ? value.join(', ')
      : '';

  const handleTextChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    onChange(e.target.value);
  };

  const renderTfng = (options: string[]) => {
    const current = typeof value === 'string' ? value : '';

    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const picked = current === opt;
          return (
            <Button
              key={opt}
              type="button"
              size="sm"
              variant={picked ? 'primary' : 'outline'}
              className="rounded-full px-3 text-xs"
              onClick={() => onChange(picked ? '' : opt)}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderMcq = () => {
    const opts = getMcqOptions(question);
    const current = typeof value === 'string' ? value : '';

    if (!opts.length) {
      return (
        <input
          type="text"
          value={currentTextValue}
          onChange={handleTextChange}
          className="w-full rounded-md border border-lightBorder bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-dark dark:border-white/10"
          placeholder="Type your answer"
        />
      );
    }

    return (
      <div className="space-y-2">
        {opts.map((opt, idx) => {
          const letter = String.fromCharCode('A'.charCodeAt(0) + idx);
          const picked = current === letter || current === opt;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(picked ? '' : letter)}
              className={[
                'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition',
                picked
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-lightBorder bg-background hover:border-primary/60 dark:bg-dark dark:border-white/10',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-lightBorder text-[11px] font-semibold dark:border-white/10">
                  {letter}
                </span>
                <span className="text-foreground">{opt}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderShortAnswer = () => (
    <input
      type="text"
      value={currentTextValue}
      onChange={handleTextChange}
      className="w-full rounded-md border border-lightBorder bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-dark dark:border-white/10"
      placeholder="Write your answer"
    />
  );

  const renderGapFill = () => {
    const constraints = (question as any).constraintsJson ?? {};
    const blanksRaw = constraints.blanks ?? constraints.gaps?.length ?? 1;
    const blanks = Math.max(1, Number(blanksRaw) || 1);
    const labels: string[] = Array.isArray(constraints.labels)
      ? constraints.labels
      : [];
    const currentObj =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};

    return (
      <div className="space-y-2">
        {Array.from({ length: blanks }).map((_, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className="w-6 text-right">{idx + 1}.</span>
            <input
              type="text"
              value={currentObj[idx] ?? ''}
              onChange={(e) =>
                onChange({
                  ...currentObj,
                  [idx]: e.target.value,
                })
              }
              className="flex-1 rounded-md border border-lightBorder bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring dark:bg-dark dark:border-white/10"
              placeholder={labels[idx] ?? 'Type your answer'}
            />
          </label>
        ))}
        <p className="text-[11px] text-muted-foreground">
          Enter one answer per blank; use capital letters for names.
        </p>
      </div>
    );
  };

  const renderMatching = () => {
    const constraints = (question as any).constraintsJson ?? {};
    const prompts: string[] = Array.isArray(constraints.prompts)
      ? constraints.prompts
      : Array.isArray(constraints.pairs)
      ? constraints.pairs
      : [];
    const options: string[] = Array.isArray(constraints.options)
      ? constraints.options
      : [];

    if (!prompts.length || !options.length) {
      return renderGeneric();
    }

    const currentObj =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};

    return (
      <div className="space-y-2 text-xs">
        {prompts.map((prompt, idx) => (
          <div
            key={`${prompt}-${idx}`}
            className="flex flex-col gap-1 rounded-md border border-lightBorder bg-background/60 p-2 dark:bg-dark/70 dark:border-white/10 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="font-medium text-foreground sm:min-w-[140px]">
              {prompt}
            </span>
            <select
              className="w-full rounded-md border border-lightBorder bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring dark:bg-dark dark:border-white/10"
              value={currentObj[idx] ?? ''}
              onChange={(e) =>
                onChange({
                  ...currentObj,
                  [idx]: e.target.value,
                })
              }
            >
              <option value="">Select</option>
              {options.map((opt) => (
                <option key={`${opt}-${idx}`} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  };

  const renderGeneric = () => (
    <textarea
      value={currentTextValue}
      onChange={handleTextChange}
      className="w-full min-h-[60px] rounded-md border border-lightBorder bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-dark dark:border-white/10"
      placeholder="Answer"
    />
  );

  let control: React.ReactNode;
  if (kind === 'tfng') control = renderTfng(TFNG_OPTIONS);
  else if (kind === 'yynn') control = renderTfng(YYNN_OPTIONS);
  else if (kind === 'mcq') control = renderMcq();
  else if (kind === 'gap') control = renderGapFill();
  else if (kind === 'match') control = renderMatching();
  else if (kind === 'short') control = renderShortAnswer();
  else control = renderGeneric();

  return (
    <Card className="space-y-3 rounded-ds-xl border border-lightBorder bg-background/95 p-4 text-sm shadow-sm dark:bg-dark/90 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {question.questionOrder}
          </span>
          <div>
            <div className="font-semibold text-foreground leading-tight">
              {question.prompt}
            </div>
            {question.instruction && (
              <p className="mt-1 text-xs text-muted-foreground">
                {question.instruction}
              </p>
            )}
          </div>
        </div>

        {onToggleFlag && (
          <Button
            size="xs"
            variant={isFlagged ? 'soft' : 'outline'}
            tone={isFlagged ? 'warning' : 'default'}
            onClick={onToggleFlag}
            aria-pressed={isFlagged}
            className="rounded-ds"
          >
            {isFlagged ? 'Marked for review' : 'Mark for review'}
          </Button>
        )}
      </div>

      <div>{control}</div>
    </Card>
  );
};

export default ReadingQuestionItem;
