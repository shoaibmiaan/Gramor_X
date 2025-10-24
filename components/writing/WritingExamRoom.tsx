// components/writing/WritingExamRoom.tsx
// Main exam room shell for IELTS Writing mock attempts.

import React, { useCallback, useMemo, useState } from 'react';

import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import TextareaAutosize from '@/components/design-system/TextareaAutosize';
import { StickyActionBar } from '@/components/exam/StickyActionBar';
import { BottomActionBar } from '@/components/mobile/BottomActionBar';
import VoiceDraftToggle from '@/components/writing/VoiceDraftToggle';
import WritingAutosaveIndicator from '@/components/writing/WritingAutosaveIndicator';
import WritingTimer from '@/components/writing/WritingTimer';
import { useAutoSaveDraft } from '@/lib/mock/useAutoSaveDraft';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
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
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const resumedAt = initialDraft?.updatedAt ? new Date(initialDraft.updatedAt) : null;

  const { timeLeft } = useExamTimer(durationSeconds, {
    autoStart: true,
    onFinish: () => {
      void handleSubmit(true);
    },
  });

  const counts = useMemo(
    () => ({
      task1: countWords(task1Essay),
      task2: countWords(task2Essay),
    }),
    [task1Essay, task2Essay],
  );

  const elapsedSeconds = Math.max(0, durationSeconds - timeLeft);

  const tasksPayload = useMemo(() => {
    const payload: Record<string, { content: string; wordCount: number }> = {};
    if (task1Essay.trim().length > 0) {
      payload.task1 = { content: task1Essay, wordCount: counts.task1 };
    }
    if (task2Essay.trim().length > 0) {
      payload.task2 = { content: task2Essay, wordCount: counts.task2 };
    }
    return payload;
  }, [counts.task1, counts.task2, task1Essay, task2Essay]);

  const { state: autosaveState, lastSavedAt, flush: flushAutosave } = useAutoSaveDraft({
    attemptId,
    activeTask,
    tasks: tasksPayload,
    elapsedSeconds,
    enabled: !submitting,
  });

  const handleSubmit = useCallback(
    async (autoTriggered = false) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      flushAutosave();

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
        onSubmitSuccess?.(data);
      } catch (err: any) {
        if (!autoTriggered) {
          setError(err?.message ?? 'Unexpected error');
        } else {
          setError('Time elapsed. We attempted to auto-submit but encountered an error. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      attemptId,
      durationSeconds,
      flushAutosave,
      onSubmitSuccess,
      prompts.task1.id,
      prompts.task2.id,
      submitting,
      task1Essay,
      task2Essay,
    ],
  );

  const tasks = useMemo(
    () => [
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
    ],
    [counts.task1, counts.task2, prompts.task1, prompts.task2, task1Essay, task2Essay],
  );

  const active = tasks.find((task) => task.key === activeTask) ?? tasks[0];
  const minWords = MIN_WORDS[active.key];
  const textareaId = `writing-${active.key}-response`;
  const helperId = `writing-${active.key}-helper`;
  const belowMin = active.count < minWords;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Mock Writing Exam</h1>
            <p className="text-sm text-muted-foreground">
              Complete both tasks within {Math.round(durationSeconds / 60)} minutes. Autosave runs every few seconds.
            </p>
          </div>
          <WritingTimer seconds={timeLeft} totalSeconds={durationSeconds} />
        </div>
        {resumedAt ? (
          <Alert
            variant="info"
            title="Draft restored"
            description={`We loaded your last autosave from ${resumedAt.toLocaleString()}. Keep typing—autosave is active.`}
          />
        ) : null}
        <VoiceDraftToggle onToggle={setVoiceEnabled} />
        <div className="flex flex-wrap items-center gap-2">
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
          minRows={voiceEnabled ? 12 : 16}
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

      <div className="hidden md:block">
        <StickyActionBar
          left={<WritingAutosaveIndicator state={autosaveState} updatedAt={lastSavedAt} />}
          right={
            <Button onClick={() => handleSubmit(false)} loading={submitting} disabled={submitting}>
              Submit for scoring
            </Button>
          }
        />
      </div>
      <div className="md:hidden">
        <BottomActionBar
          leading={<WritingAutosaveIndicator state={autosaveState} updatedAt={lastSavedAt} />}
          stacked
        >
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleSubmit(false)}
            loading={submitting}
            disabled={submitting}
          >
            Submit for scoring
          </Button>
        </BottomActionBar>
      </div>
    </div>
  );
};

export default WritingExamRoom;
