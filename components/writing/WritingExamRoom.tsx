// components/writing/WritingExamRoom.tsx
// Main exam room shell for IELTS Writing mock attempts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import TextareaAutosize from '@/components/design-system/TextareaAutosize';
import { BottomActionBar } from '@/components/mobile/BottomActionBar';
import VoiceDraftToggle from '@/components/writing/VoiceDraftToggle';
import WritingAutosaveIndicator from '@/components/writing/WritingAutosaveIndicator';
import WritingTimer from '@/components/writing/WritingTimer';
import { useAutoSaveDraft } from '@/lib/mock/useAutoSaveDraft';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { persistExamEvent } from '@/lib/writing/autosave';
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
  const [focusWarning, setFocusWarning] = useState<string | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);

  const resumedAt = initialDraft?.updatedAt ? new Date(initialDraft.updatedAt) : null;

  const { timeLeft, pause: pauseTimer, resume: resumeTimer } = useExamTimer(durationSeconds, {
    autoStart: true,
    onFinish: () => {
      void handleSubmit(true);
    },
  });

  const tabSwitchesRef = useRef(0);
  const focusLostRef = useRef(false);
  const warningTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const counts = useMemo(
    () => ({
      task1: countWords(task1Essay),
      task2: countWords(task2Essay),
    }),
    [task1Essay, task2Essay],
  );

  const elapsedSeconds = Math.max(0, durationSeconds - timeLeft);
  const totalWordCount = counts.task1 + counts.task2;

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
    throttleMs: 10000,
  });

  const showFocusWarning = useCallback((message: string) => {
    setFocusWarning(message);
    if (typeof window === 'undefined') return;
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = window.setTimeout(() => {
      setFocusWarning(null);
      warningTimeoutRef.current = null;
    }, 6000);
  }, []);

  const incrementTabSwitches = useCallback(() => {
    tabSwitchesRef.current += 1;
    setTabSwitches(tabSwitchesRef.current);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const handleFocusLoss = (reason: 'visibility' | 'blur') => {
      if (focusLostRef.current) return;
      focusLostRef.current = true;
      incrementTabSwitches();
      pauseTimer();
      flushAutosave();
      void persistExamEvent(attemptId, 'blur', {
        reason,
        tabSwitches: tabSwitchesRef.current,
        occurredAt: new Date().toISOString(),
      }).catch(() => {});
    };

    const handleFocusGain = (reason: 'visibility' | 'focus') => {
      if (!focusLostRef.current) return;
      focusLostRef.current = false;
      resumeTimer();
      showFocusWarning('You switched tabs during the test. The timer was paused while you were away.');
      void persistExamEvent(attemptId, 'focus', {
        reason,
        tabSwitches: tabSwitchesRef.current,
        resumedAt: new Date().toISOString(),
      }).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleFocusLoss('visibility');
      } else {
        handleFocusGain('visibility');
      }
    };

    const onBlur = () => handleFocusLoss('blur');
    const onFocus = () => handleFocusGain('focus');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [attemptId, flushAutosave, incrementTabSwitches, pauseTimer, resumeTimer, showFocusWarning]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && warningTimeoutRef.current) {
        window.clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback(
    async (autoTriggered = false) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      flushAutosave();

      try {
        const submissionTasks: {
          task1?: { essay: string; promptId: string };
          task2?: { essay: string; promptId: string };
        } = {};
        const trimmedTask1 = task1Essay.trim();
        const trimmedTask2 = task2Essay.trim();
        if (trimmedTask1.length > 0) {
          submissionTasks.task1 = { essay: task1Essay, promptId: prompts.task1.id };
        }
        if (trimmedTask2.length > 0) {
          submissionTasks.task2 = { essay: task2Essay, promptId: prompts.task2.id };
        }

        const res = await fetch('/api/mock/writing/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            durationSeconds,
            tasks: submissionTasks,
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

  const handleTranscript = useCallback(
    (delta: string) => {
      const addition = delta.trim();
      if (!addition) return;
      if (activeTask === 'task1') {
        setTask1Essay((prev) => {
          if (!prev) return addition;
          const needsSpace = !/\s$/.test(prev);
          return `${prev}${needsSpace ? ' ' : ''}${addition}`;
        });
      } else {
        setTask2Essay((prev) => {
          if (!prev) return addition;
          const needsSpace = !/\s$/.test(prev);
          return `${prev}${needsSpace ? ' ' : ''}${addition}`;
        });
      }
    },
    [activeTask, setTask1Essay, setTask2Essay],
  );

  useEffect(() => {
    if (!voiceEnabled) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const node = textareaRef.current;
    if (!node) return;
    try {
      if (document.activeElement !== node) {
        node.focus();
      }
      const end = node.value.length;
      node.setSelectionRange(end, end);
    } catch {
      // ignore focus/selection errors
    }
  }, [activeTask, voiceEnabled]);

  return (
    <div className="flex flex-col gap-6">
      {focusWarning ? (
        <Alert variant="warning" title="Focus guard">
          {focusWarning}
        </Alert>
      ) : null}
      {resumedAt ? (
        <Alert
          variant="info"
          title="Draft restored"
          description={`We loaded your last autosave from ${resumedAt.toLocaleString()}. Keep typing—autosave is active.`}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="flex flex-col gap-4">
          {tasks.map((task) => (
            <Card
              key={task.key}
              className={clsx(
                'rounded-ds-2xl border border-border/60 bg-background/90 p-5 shadow-sm',
                activeTask === task.key && 'border-primary/60 bg-primary/5 shadow-primary/10',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {task.label}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="sm">
                    {MIN_WORDS[task.key]}+ words
                  </Badge>
                  {activeTask === task.key ? (
                    <Badge variant="primary" size="sm">
                      Active
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="info" size="sm">
                  {task.prompt.module === 'general_training' ? 'General Training' : 'Academic'}
                </Badge>
                <Badge variant="subtle" size="sm" className="capitalize">
                  {task.prompt.difficulty}
                </Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{task.prompt.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {task.prompt.promptText}
              </p>
              {activeTask !== task.key ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 hidden rounded-ds lg:inline-flex"
                  onClick={() => setActiveTask(task.key)}
                >
                  Focus this task
                </Button>
              ) : null}
            </Card>
          ))}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-ds-2xl border border-border/60 bg-background/95 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <WritingAutosaveIndicator state={autosaveState} updatedAt={lastSavedAt} />
                <Badge variant="info" size="sm">
                  Focus guard
                </Badge>
                {tabSwitches > 0 ? (
                  <Badge variant="warning" size="sm">
                    {tabSwitches} tab switch{tabSwitches === 1 ? '' : 'es'} noted
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Leaving this tab pauses the timer automatically.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Word count</span>
                  <span className="font-mono text-base text-foreground">{counts[activeTask]}</span>
                  <span className="text-xs text-muted-foreground">active</span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    •
                  </span>
                  <span className="font-mono text-sm text-foreground">{totalWordCount}</span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
                <WritingTimer seconds={timeLeft} totalSeconds={durationSeconds} />
                <Button
                  onClick={() => handleSubmit(false)}
                  loading={submitting}
                  disabled={submitting}
                  className="hidden rounded-ds md:inline-flex"
                >
                  Submit test
                </Button>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Complete both tasks within {Math.round(durationSeconds / 60)} minutes. Autosave runs every 10 seconds and the
            timer pauses if you leave the tab.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {tasks.map((task) => (
                <Button
                  key={task.key}
                  size="sm"
                  variant={activeTask === task.key ? 'primary' : 'ghost'}
                  className="rounded-full"
                  onClick={() => setActiveTask(task.key)}
                >
                  {task.label} · {task.count} words
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <VoiceDraftToggle onToggle={setVoiceEnabled} onTranscript={handleTranscript} />
              {voiceEnabled ? (
                <Badge variant="success" size="sm">
                  Listening
                </Badge>
              ) : null}
            </div>
          </div>

          {error ? (
            <Alert variant="danger" title="Submission failed">
              {error}
            </Alert>
          ) : null}

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground" htmlFor={textareaId}>
              {active.label} response
            </label>
            <span className="text-xs text-muted-foreground">Aim for at least {minWords} words.</span>
          </div>
          <Card className="rounded-ds-2xl border border-border/60 bg-background/90 p-0">
            <TextareaAutosize
              minRows={voiceEnabled ? 14 : 18}
              value={active.value}
              id={textareaId}
              aria-describedby={belowMin ? helperId : undefined}
              onChange={(event) => active.setter(event.target.value)}
              ref={textareaRef}
              className="w-full resize-none rounded-ds-2xl border-0 bg-transparent p-6 text-base leading-7 text-foreground focus:outline-none"
            />
          </Card>
          {belowMin ? (
            <p id={helperId} className="text-sm text-amber-600">
              Add at least {minWords - active.count} more words to meet the recommended minimum.
            </p>
          ) : null}
        </div>
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
            Submit test
          </Button>
        </BottomActionBar>
      </div>
    </div>
  );
};

export default WritingExamRoom;
