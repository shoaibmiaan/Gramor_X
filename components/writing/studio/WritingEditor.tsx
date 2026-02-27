import { useCallback } from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { TextareaAutosize } from '@/components/design-system/TextareaAutosize';
import type { WritingTaskType } from '@/lib/writing/schemas';
import { WordCountBar } from './WordCountBar';
import { TimerBar } from './TimerBar';

export type WritingEditorProps = {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  elapsedMs: number;
  taskType: WritingTaskType;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  status: 'draft' | 'submitted' | 'scored';
  submitting: boolean;
  disableSubmit: boolean;
  onSubmit: () => void;
  helper?: string;
  onBulkPaste?: (text: string) => void;
};

const statusCopy: Record<WritingEditorProps['status'], string> = {
  draft: 'Draft',
  submitted: 'Submitted for scoring',
  scored: 'Scored',
};

export const WritingEditor = ({
  value,
  onChange,
  wordCount,
  elapsedMs,
  taskType,
  saveState,
  status,
  submitting,
  disableSubmit,
  onSubmit,
  helper,
  onBulkPaste,
}: WritingEditorProps) => {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !disableSubmit) {
        event.preventDefault();
        onSubmit();
      }
    },
    [disableSubmit, onSubmit],
  );

  return (
    <Card className="space-y-6" padding="lg">
      <div className="grid gap-4 md:grid-cols-2">
        <WordCountBar taskType={taskType} wordCount={wordCount} />
        <TimerBar taskType={taskType} elapsedMs={elapsedMs} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Status: <span className="font-semibold text-foreground">{statusCopy[status]}</span>
        </span>
        <span>
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && 'Saved'}
          {saveState === 'error' && 'Save failed'}
          {saveState === 'idle' && 'Ready'}
        </span>
      </div>
      <label className="space-y-2">
        <span className="sr-only">Writing response</span>
        <TextareaAutosize
          minRows={16}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(event) => {
            const pasted = event.clipboardData?.getData('text') ?? '';
            if (pasted && pasted.split(/\s+/).filter(Boolean).length > 80) {
              onBulkPaste?.(pasted);
            }
          }}
          disabled={status !== 'draft'}
          className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Begin your response here…"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <Button
          variant="primary"
          size="md"
          onClick={onSubmit}
          disabled={disableSubmit}
          loading={submitting}
        >
          Submit for scoring
        </Button>
        <div className="space-y-1 text-right md:text-left">
          <p>Press ⌘⏎ / Ctrl+Enter to submit instantly.</p>
          {helper && <p>{helper}</p>}
        </div>
      </div>
    </Card>
  );
};
