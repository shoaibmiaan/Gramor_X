// components/writing/WritingExamRoom.tsx
// Main exam room shell for IELTS Writing mock attempts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import TextareaAutosize from '@/components/design-system/TextareaAutosize';
import { StickyActionBar } from '@/components/exam/StickyActionBar';
import WritingAutosaveIndicator, { AutosaveState } from '@/components/writing/WritingAutosaveIndicator';
import WritingTimer from '@/components/writing/WritingTimer';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { saveWritingDraft } from '@/lib/writing/autosave';
import type { WritingExamPrompts, WritingScorePayload, WritingTaskType } from '@/types/writing';

const MIN_WORDS: Record<WritingTaskType, number> = { task1: 150, task2: 250 };

const countWords = (value: string) => {
  if (!value) return 0;
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

type SubmitResult = {
  attemptId: string;
  results: Partial<Record<WritingTaskType, WritingScorePayload>>;
};

type Props = {
  attemptId: string;
  prompts: WritingExamPrompts;
  durationSeconds: number;
  initialDraft?: {
    task1?: { essay: string; wordCount: number };
    task2?: { essay: string; wordCount: number };
    updatedAt?: string;
  } | null;
  onSubmitSuccess?: (result: SubmitResult) => void;
};

export const WritingExamRoom: React.FC<Props> = ({
  attemptId,
  prompts,
  durationSeconds,
  initialDraft,
  onSubmitSuccess,
}) => {
  const [activeTask, setActiveTask] = useState<WritingTaskType>('task1');
  const [task1Essay, setTask1Essay] = useState(initialDraft?.task1?.essay ?? '');
  const [task2Essay, setTask2Essay] = useState(initialDraft?.task2?.essay ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialDraft?.updatedAt ?? null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { timeLeft } = useExamTimer(durationSeconds, { autoStart: true });

  const counts = useMemo(
    () => ({
      task1: countWords(task1Essay),
      task2: countWords(task2Essay),
    }),
    [task1Essay, task2Essay],
  );

  const debouncedAutosave = useDebouncedCallback(
    async (payload: Parameters<typeof saveWritingDraft>[0]) => {
      if (!payload.tasks.task1 && !payload.tasks.task2) {
        if (isMounted.current) {
          setAutosaveState('idle');
        }
        return;
      }
      try {
        if (isMounted.current) setAutosaveState('saving');
        const response = await saveWritingDraft(payload);
        if (!isMounted.current) return;
        setAutosaveState('saved');
        setLastSavedAt(response.savedAt ?? new Date().toISOString());
      } catch (err) {
        if (!isMounted.current) return;
        setAutosaveState('error');
        console.error('writing autosave failed', err);
      }
    },
    1200,
    { maxWait: 4000 },
  );

  useEffect(() => {
    return () => {
      debouncedAutosave.flush();
    };
  }, [debouncedAutosave]);

  useEffect(() => {
    if (!attemptId) return;
    const elapsedSeconds = Math.max(0, durationSeconds - timeLeft);
    debouncedAutosave({
      attemptId,
      activeTask,
      elapsedSeconds,
      tasks: {
        task1: { content: task1Essay, wordCount: counts.task1 },
        task2: { content: task2Essay, wordCount: counts.task2 },
      },
    });
  }, [
    attemptId,
    activeTask,
    counts.task1,
    counts.task2,
    debouncedAutosave,
    durationSeconds,
    task1Essay,
    task2Essay,
    timeLeft,
  ]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    debouncedAutosave.flush();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/mock/writing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          durationSeconds,
          tasks: {
            task1: { essay: task1Essay, promptId: prompts.task1.id },
            task2: { essay: task2Essay, promptId: prompts.task2.id },
          },
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Submission failed');
      }
      const data = (await res.json()) as SubmitResult;
      if (isMounted.current) {
        setAutosaveState('idle');
        onSubmitSuccess?.(data);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message ?? 'Unexpected error');
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  }, [
    activeTask,
    attemptId,
    debouncedAutosave,
    durationSeconds,
    onSubmitSuccess,
    submitting,
    task1Essay,
    task2Essay,
    prompts.task1.id,
    prompts.task2.id,
  ]);

  const tasks = useMemo(() => [
    {
      key: 'task1' as const,
      label: 'Task 1',
      prompt: prompts.task1,
      value: task1Essay,
      setter: setTask1Essay,
      count: counts.task1,
    },
    {
      key: 'task2' as const,
      label: 'Task 2',
      prompt: prompts.task2,
      value: task2Essay,
      setter: setTask2Essay,
      count: counts.task2,
    },
  ], [counts.task1, counts.task2, prompts.task1, prompts.task2, task1Essay, task2Essay]);

  const active = tasks.find((task) => task.key === activeTask) ?? tasks[0];
  const minWords = MIN_WORDS[active.key];
  const textareaId = `writing-${active.key}-response`;
  const helperId = `writing-${active.key}-helper`;
  const belowMin = active.count < minWords;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Mock Writing Exam</h1>
            <p className="text-sm text-muted-foreground">
              Complete both tasks within {Math.round(durationSeconds / 60)} minutes. Autosave runs every few seconds.
            </p>
          </div>
          <WritingTimer seconds={timeLeft} totalSeconds={durationSeconds} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {tasks.map((task) => (
            <button
              key={task.key}
              type="button"
              onClick={() => setActiveTask(task.key)}
              className={`rounded-full border px-4 py-1 text-sm transition-colors ${
                activeTask === task.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {task.label} · {task.count} words
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">{active.prompt.title}</h2>
          <p className="mt-2 whitespace-pre-wrap leading-6">{active.prompt.promptText}</p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <label className="text-sm font-medium text-muted-foreground" htmlFor={textareaId}>
          {active.label} response ({active.count} words, minimum {minWords})
        </label>
        <TextareaAutosize
          minRows={16}
          value={active.value}
          id={textareaId}
          aria-describedby={belowMin ? helperId : undefined}
          onChange={(event) => active.setter(event.target.value)}
          className="text-base"
        />
        {belowMin && (
          <p id={helperId} className="text-sm text-amber-600">
            Add at least {minWords - active.count} more words to meet the recommended minimum.
          </p>
        )}
      </section>

      {error && <Alert variant="danger" title="Submission failed">{error}</Alert>}

      <StickyActionBar
        left={<WritingAutosaveIndicator state={autosaveState} updatedAt={lastSavedAt} />}
        right={
          <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
            Submit for scoring
          </Button>
        }
      />
    </div>
  );
};

export default WritingExamRoom;
