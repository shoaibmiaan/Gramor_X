// components/reading/ReadingQuestionItem.tsx
import * as React from 'react';
import type { ReadingQuestion } from '@/lib/reading/types';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { cn } from '@/lib/utils';

type AnswerValue = string | string[] | Record<string, unknown> | null;

type ReadingQuestionItemProps = {
  question: ReadingQuestion;
  prevQuestion?: ReadingQuestion; // ✅ New prop
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  noBorder?: boolean;
};

type QuestionKind = 'tfng' | 'yynn' | 'mcq' | 'gap' | 'match' | 'short' | 'other';

const TFNG_OPTIONS = ['True', 'False', 'Not Given'];
const YYNN_OPTIONS = ['Yes', 'No', 'Not Given'];

function getQuestionKind(q: ReadingQuestion): QuestionKind {
  const id = String((q as any).questionTypeId ?? '').toLowerCase();
  if (id === 'tfng' || id === 'true_false_not_given') return 'tfng';
  if (id === 'yynn' || id === 'yes_no_not_given') return 'yynn';
  if (id.startsWith('mcq') || id.includes('choice')) return 'mcq';
  if (id.includes('gap') || id.includes('blank') || id.includes('summary')) return 'gap';
  if (id.includes('match')) return 'match';
  if (id === 'short_answer' || id === 'sentence_completion' || id === 'summary_completion') {
    return 'short';
  }
  return 'other';
}

function getMcqOptions(q: ReadingQuestion): string[] {
  const rawConstraints = (q as any).constraintsJson as { options?: string[]; labels?: string[] } | undefined;
  if (rawConstraints) {
    if (Array.isArray(rawConstraints.options)) return rawConstraints.options.map(String);
    if (Array.isArray(rawConstraints.labels)) return rawConstraints.labels.map(String);
  }
  return [];
}

export const ReadingQuestionItem: React.FC<ReadingQuestionItemProps> = ({
  question,
  prevQuestion,
  value,
  onChange,
  isFlagged = false,
  onToggleFlag,
  noBorder = false,
}) => {
  const kind = getQuestionKind(question);
  const currentTextValue = typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : '';

  const handleTextChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    onChange(e.target.value);
  };

  // --- Determine if instruction should show ---
  const showInstruction =
    question.instruction &&
    (!prevQuestion || prevQuestion.groupId !== question.groupId);

  // --- TFNG / YYNN ---
  const renderBinary = (options: string[]) => {
    const current = typeof value === 'string' ? value : '';
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {options.map((opt) => {
          const picked = current === opt;
          return (
            <Button
              key={opt}
              type="button"
              size="sm"
              variant={picked ? 'primary' : 'outline'}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-medium',
                picked ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              onClick={() => onChange(picked ? '' : opt)}
              aria-pressed={picked}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    );
  };

  // --- MCQ ---
  const renderMcq = () => {
    const opts = getMcqOptions(question);
    const current = typeof value === 'string' ? value : '';

    if (!opts.length) {
      return (
        <input
          type="text"
          value={currentTextValue}
          onChange={handleTextChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-3"
          placeholder="Type your answer"
        />
      );
    }

    return (
      <div className="space-y-2 mt-3" role="radiogroup" aria-label="Answer choices">
        {opts.map((opt, idx) => {
          const letter = String.fromCharCode('A'.charCodeAt(0) + idx);
          const picked = current === letter || current === opt;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(picked ? '' : letter)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition',
                picked
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background hover:border-primary/50 hover:bg-muted/50',
              )}
              role="radio"
              aria-checked={picked}
            >
              <span className="flex items-center gap-3">
                <span className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium',
                  picked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                )}>
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

  // --- Short Answer ---
  const renderShortAnswer = () => (
    <input
      type="text"
      value={currentTextValue}
      onChange={handleTextChange}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-3"
      placeholder="Write your answer"
    />
  );

  // --- Gap Fill ---
  const renderGapFill = () => {
    const constraints = (question as any).constraintsJson ?? {};
    const blanksRaw = constraints.blanks ?? constraints.gaps?.length ?? 1;
    const blanks = Math.max(1, Number(blanksRaw) || 1);
    const labels: string[] = Array.isArray(constraints.labels) ? constraints.labels : [];
    const currentObj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string>) : {};

    return (
      <div className="space-y-3 mt-3">
        {Array.from({ length: blanks }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-6 text-sm text-muted-foreground">{idx + 1}.</span>
            <input
              type="text"
              value={currentObj[idx] ?? ''}
              onChange={(e) =>
                onChange({
                  ...currentObj,
                  [idx]: e.target.value,
                })
              }
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={labels[idx] ?? 'Type your answer'}
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">
          Enter one answer per blank. Use capital letters for names.
        </p>
      </div>
    );
  };

  // --- Matching ---
  const renderMatching = () => {
    const constraints = (question as any).constraintsJson ?? {};
    const prompts: string[] = Array.isArray(constraints.prompts)
      ? constraints.prompts
      : Array.isArray(constraints.pairs)
      ? constraints.pairs
      : [];
    const options: string[] = Array.isArray(constraints.options) ? constraints.options : [];

    if (!prompts.length || !options.length) return renderGeneric();

    const currentObj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string>) : {};

    const usedOptions = new Set<string>();
    Object.entries(currentObj).forEach(([key, val]) => {
      if (val && val !== '') usedOptions.add(val);
    });

    return (
      <div className="space-y-3 mt-3">
        {prompts.map((prompt, idx) => {
          const selectedValue = currentObj[idx] ?? '';
          return (
            <div
              key={`${prompt}-${idx}`}
              className="flex flex-col gap-2 rounded-md border border-input bg-background/50 p-3 sm:flex-row sm:items-center"
            >
              <span className="text-sm font-medium text-foreground sm:min-w-[140px]">
                {prompt}
              </span>
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedValue}
                onChange={(e) =>
                  onChange({
                    ...currentObj,
                    [idx]: e.target.value,
                  })
                }
                aria-label={`Match for ${prompt}`}
              >
                <option value="">Select an option</option>
                {options.map((opt) => {
                  const disabled = usedOptions.has(opt) && opt !== selectedValue;
                  return (
                    <option key={`${opt}-${idx}`} value={opt} disabled={disabled}>
                      {opt} {disabled ? '(already used)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGeneric = () => (
    <textarea
      value={currentTextValue}
      onChange={handleTextChange}
      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-3"
      placeholder="Type your answer here..."
    />
  );

  let control: React.ReactNode;
  if (kind === 'tfng') control = renderBinary(TFNG_OPTIONS);
  else if (kind === 'yynn') control = renderBinary(YYNN_OPTIONS);
  else if (kind === 'mcq') control = renderMcq();
  else if (kind === 'gap') control = renderGapFill();
  else if (kind === 'match') control = renderMatching();
  else if (kind === 'short') control = renderShortAnswer();
  else control = renderGeneric();

  const Container = noBorder ? 'div' : Card;
  const containerProps = noBorder
    ? { className: "py-4 first:pt-0 last:pb-0 border-b border-border last:border-0" }
    : { className: cn("rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-card/90") };

  return (
    <Container {...containerProps}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground"
          aria-label={`Question ${question.questionOrder}`}
        >
          {question.questionOrder}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground leading-relaxed">
            {question.prompt}
          </div>

          {showInstruction && (
            <p className="mt-1 text-xs text-muted-foreground italic">
              {question.instruction}
            </p>
          )}

          {control}

          {onToggleFlag && (
            <div className="mt-4 flex justify-end">
              <Button
                size="xs"
                variant={isFlagged ? 'soft' : 'outline'}
                tone={isFlagged ? 'warning' : 'default'}
                onClick={onToggleFlag}
                className={cn(
                  "rounded-full px-3 text-xs",
                  isFlagged && "bg-amber-500/10 text-amber-600 border-amber-500/30"
                )}
                aria-pressed={isFlagged}
              >
                {isFlagged ? 'Flagged for review' : 'Mark for review'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ReadingQuestionItem;