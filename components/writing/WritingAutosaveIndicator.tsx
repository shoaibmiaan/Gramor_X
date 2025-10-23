// components/writing/WritingAutosaveIndicator.tsx
// Small status indicator rendered in the exam room footer.

import React from 'react';
import clsx from 'clsx';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  state: AutosaveState;
  updatedAt?: string | null;
};

const LABELS: Record<AutosaveState, string> = {
  idle: 'All changes saved',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

export const WritingAutosaveIndicator: React.FC<Props> = ({ state, updatedAt }) => {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 text-xs',
        state === 'error' ? 'text-red-600' : 'text-muted-foreground',
      )}
      aria-live="polite"
    >
      <span
        className={clsx('h-2 w-2 rounded-full', {
          'bg-primary animate-pulse': state === 'saving',
          'bg-emerald-500': state === 'saved',
          'bg-red-500': state === 'error',
          'bg-muted': state === 'idle',
        })}
      />
      <span>
        {LABELS[state]}
        {updatedAt ? ` • ${new Date(updatedAt).toLocaleTimeString()}` : ''}
      </span>
    </div>
  );
};

export default WritingAutosaveIndicator;
