// components/reading/QuestionRenderer.tsx

import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { cn } from '@/lib/utils';

type BaseProps = {
  value: any;
  onChange: (v: any) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
};

// -----------------------------
// TRUE / FALSE / NOT GIVEN
// -----------------------------
export const TFNGQuestion: React.FC<
  BaseProps & { prompt: string }
> = ({ prompt, value, onChange }) => {
  const opts = [
    { key: 'true', label: 'TRUE', letter: 'T' },
    { key: 'false', label: 'FALSE', letter: 'F' },
    { key: 'not-given', label: 'NOT GIVEN', letter: 'NG' },
  ];

  return (
    <div className="space-y-3">
      <p className="font-medium">{prompt}</p>

      <div className="flex flex-col gap-2 ml-1">
        {opts.map((o) => (
          <div
            key={o.key}
            className={cn(
              'flex items-center border rounded-md px-3 py-2 cursor-pointer select-none transition',
              'border-border bg-card hover:bg-muted/40',
              value === o.key &&
                'border-primary bg-primary/10 ring-1 ring-primary'
            )}
            onClick={() => onChange(o.key)}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center font-semibold mr-3',
                value === o.key
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground'
              )}
            >
              {o.letter}
            </div>
            <span className="text-sm">{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// -----------------------------
// MULTIPLE CHOICE (A/B/C/D…)
// -----------------------------
export const MCQQuestion: React.FC<
  BaseProps & { prompt: string; options: string[] }
> = ({ prompt, options, value, onChange }) => {
  return (
    <div className="space-y-3">
      <p className="font-medium">{prompt}</p>

      <div className="flex flex-col gap-2 ml-1">
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C…
          return (
            <div
              key={opt}
              className={cn(
                'flex items-center border rounded-md px-3 py-2 cursor-pointer transition',
                'border-border bg-card hover:bg-muted/40',
                value === opt &&
                  'border-primary bg-primary/10 ring-1 ring-primary'
              )}
              onClick={() => onChange(opt)}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center font-semibold mr-3',
                  value === opt
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground'
                )}
              >
                {letter}
              </div>

              <span className="text-sm">{opt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -----------------------------
// SHORT ANSWER / FILL BLANK
// -----------------------------
export const ShortQuestion: React.FC<
  BaseProps & { prompt: string }
> = ({ prompt, value, onChange }) => {
  return (
    <div className="space-y-3">
      <p className="font-medium">{prompt}</p>
      <input
        type="text"
        className={cn(
          'w-full max-w-xs px-3 py-2 border rounded-md bg-background text-sm',
          'border-border focus:ring-1 focus:ring-primary'
        )}
        value={value || ''}
        onChange={(e) => onChange(e.target.value.trim())}
      />
    </div>
  );
};

// -----------------------------
// MASTER WRAPPER
// -----------------------------
export const QuestionRenderer = ({
  question,
  value,
  onChange,
  isFlagged,
  onToggleFlag,
}: any) => {
  const type = question.questionTypeId;

  return (
    <div className="space-y-3 p-3">
      {/* FLAG */}
      <div className="flex justify-between items-center mb-1">
        <div className="text-[13px] text-muted-foreground"></div>
        {onToggleFlag ? (
          <button
            onClick={onToggleFlag}
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-md border transition',
              isFlagged
                ? 'bg-amber-300/20 border-amber-400 text-amber-700'
                : 'border-border text-muted-foreground hover:bg-muted/40'
            )}
          >
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        ) : null}
      </div>

      {/* QUESTION TYPES */}
      {type === 'tfng' || type === 'yynn' ? (
        <TFNGQuestion
          prompt={question.prompt}
          value={value}
          onChange={onChange}
        />
      ) : type === 'mcq' ? (
        <MCQQuestion
          prompt={question.prompt}
          options={question.options || []}
          value={value}
          onChange={onChange}
        />
      ) : (
        <ShortQuestion prompt={question.prompt} value={value} onChange={onChange} />
      )}
    </div>
  );
};
