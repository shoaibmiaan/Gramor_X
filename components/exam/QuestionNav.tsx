import * as React from 'react';
import { Flag } from 'lucide-react';

export type QuestionNavFilter = 'all' | 'flagged' | 'unanswered';

export type QuestionNavAnswers = Record<string, { value?: string | null; flagged?: boolean | null }>;

export type QuestionNavQuestion = {
  id: string;
  index: number;
  label?: string;
};

export type QuestionNavProps = {
  questions: QuestionNavQuestion[];
  answers: QuestionNavAnswers;
  filter: QuestionNavFilter;
  onFilterChange: (filter: QuestionNavFilter) => void;
  onSelect: (id: string) => void;
  onToggleFlag: (id: string) => void;
  currentQuestionId?: string | null;
  className?: string;
};

const FILTERS: Array<{ id: QuestionNavFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'flagged', label: 'Flagged' },
];

const isAnswered = (value?: string | null) => Boolean(value && value.trim().length > 0);

const isFlagged = (flagged?: boolean | null) => Boolean(flagged);

export function QuestionNav({
  questions,
  answers,
  filter,
  onFilterChange,
  onSelect,
  onToggleFlag,
  currentQuestionId,
  className,
}: QuestionNavProps) {
  const total = questions.length;
  const answeredCount = questions.reduce((acc, q) => (isAnswered(answers[q.id]?.value) ? acc + 1 : acc), 0);
  const flaggedCount = questions.reduce((acc, q) => (isFlagged(answers[q.id]?.flagged) ? acc + 1 : acc), 0);
  const unansweredCount = total - answeredCount;

  const filtered = questions.filter((question) => {
    const entry = answers[question.id];
    if (filter === 'flagged') {
      return isFlagged(entry?.flagged);
    }
    if (filter === 'unanswered') {
      return !isAnswered(entry?.value);
    }
    return true;
  });

  const emptyMessage = filter === 'flagged' ? 'No questions are flagged.' : 'All questions have an answer.';

  return (
    <aside
      className={[
        'rounded-3xl border border-border/80 bg-background/70 p-5 text-foreground shadow-lg shadow-black/10 backdrop-blur supports-[backdrop-filter]:backdrop-blur',
        className || '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-small font-semibold">Review questions</div>
          <div className="text-caption text-foreground/70">
            {answeredCount}/{total} answered
          </div>
        </div>
        <div className="flex items-center gap-1 text-caption text-foreground/70">
          <Flag className="h-3.5 w-3.5 text-warning" aria-hidden />
          Flagged
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Question filters">
        {FILTERS.map((item) => {
          const isActive = filter === item.id;
          const count =
            item.id === 'flagged'
              ? flaggedCount
              : item.id === 'unanswered'
              ? unansweredCount
              : total;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={[
                'rounded-full border px-3 py-1 text-small transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary',
              ].join(' ')}
              aria-pressed={isActive}
            >
              {item.label}
              <span className="ml-2 text-foreground/60">{count}</span>
            </button>
          );
        })}
      </div>

      <div
        className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6"
        role="list"
        aria-label="Question navigator"
      >
        {filtered.map((question) => {
          const entry = answers[question.id];
          const answered = isAnswered(entry?.value);
          const flagged = isFlagged(entry?.flagged);
          const isCurrent = currentQuestionId ? question.id === currentQuestionId : false;
          return (
            <div key={question.id} className="relative" role="listitem">
              <button
                type="button"
                onClick={() => onSelect(question.id)}
                className={[
                  'flex h-12 w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-caption font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  flagged
                    ? 'border-warning bg-warning/10 text-warning'
                    : answered
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border bg-background text-foreground hover:border-primary',
                  isCurrent ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background' : '',
                ].join(' ')}
                aria-pressed={isCurrent}
                aria-label={`Jump to question ${question.index}${flagged ? ' (flagged)' : ''}${
                  answered ? ' (answered)' : ' (unanswered)'
                }`}
              >
                <span>{question.index}</span>
                {question.label ? (
                  <span className="text-[10px] uppercase tracking-wide text-foreground/60">{question.label}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => onToggleFlag(question.id)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-caption text-foreground/70 transition hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={flagged ? `Unflag question ${question.index}` : `Flag question ${question.index}`}
              >
                <Flag className={['h-3.5 w-3.5', flagged ? 'text-warning' : ''].join(' ')} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-2 text-caption text-foreground/70">
          {emptyMessage}
        </p>
      ) : null}
    </aside>
  );
}

