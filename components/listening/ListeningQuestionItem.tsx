// components/listening/ListeningQuestionItem.tsx
import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

import type { ListeningQuestion } from '@/pages/mock/listening/exam/[slug]';

type AnswerValue = string | string[] | null;

type ListeningQuestionItemProps = {
  question: ListeningQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
};

export const ListeningQuestionItem: React.FC<ListeningQuestionItemProps> = ({
  question,
  value,
  onChange,
}) => {
  const parsedOptions = React.useMemo(() => {
    const raw = question.options;
    if (!raw) return [] as { label: string; value: string }[];

    // If Supabase already gives JSON
    if (Array.isArray(raw)) {
      return (raw as any[]).map((opt, idx) => {
        if (typeof opt === 'string') {
          return { label: opt, value: opt };
        }
        if (typeof opt === 'object' && opt !== null) {
          return {
            label: (opt as any).label ?? (opt as any).text ?? `Option ${idx + 1}`,
            value: (opt as any).value ?? (opt as any).key ?? String(idx),
          };
        }
        return { label: String(opt), value: String(opt) };
      });
    }

    // If stringified JSON (your case)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return (parsed as any[]).map((opt, idx) =>
            typeof opt === 'string'
              ? { label: opt, value: opt }
              : {
                  label:
                    (opt as any).label ??
                    (opt as any).text ??
                    `Option ${idx + 1}`,
                  value:
                    (opt as any).value ??
                    (opt as any).key ??
                    String(idx),
                }
          );
        }
      } catch (e) {
        console.error('Failed to parse listening options JSON:', e, raw);
      }
    }

    return [] as { label: string; value: string }[];
  }, [question.options]);

  const type = (question.type ?? 'mcq').toLowerCase();

  const handleMcqChange = (val: string) => {
    onChange(val);
  };

  const handleShortTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    e
  ) => {
    onChange(e.target.value);
  };

  const isMcq =
    type === 'mcq' || type === 'multiple_choice' || (parsedOptions.length > 0 && type === 'matching');

  const typeLabel = React.useMemo(() => {
    if (isMcq) return 'Multiple choice';
    if (type.includes('sentence')) return 'Sentence completion';
    if (type.includes('table')) return 'Table completion';
    if (type.includes('form')) return 'Form completion';
    return 'Short answer';
  }, [isMcq, type]);

  return (
    <Card className="border-none bg-background/90 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge tone="neutral" size="xs">
              Q{question.questionNo}
            </Badge>
            <Badge tone="info" size="xs">
              {typeLabel}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-relaxed">
            {question.text}
          </p>
        </div>
      </div>

      {isMcq && parsedOptions.length > 0 ? (
        <div className="mt-3 space-y-2">
          {parsedOptions.map((opt, idx) => {
            const selected = value === opt.value;
            const optionLabel = String.fromCharCode(65 + idx); // A/B/C/D...

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleMcqChange(opt.value)}
                className={[
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:bg-muted',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {optionLabel}
                </div>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Write your answer exactly as you heard it.
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary focus:ring-1 focus:ring-primary"
              value={typeof value === 'string' ? value : ''}
              onChange={handleShortTextChange}
              autoComplete="off"
            />
            <Button
              tone="neutral"
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => onChange('')}
            >
              <Icon name="eraser" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
