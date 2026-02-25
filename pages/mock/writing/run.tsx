import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import TextareaAutosize from '@/components/design-system/TextareaAutosize';
import { Tabs, TabsList, TabsTrigger } from '@/components/design-system/Tabs';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { useAutoSaveDraft } from '@/lib/mock/useAutoSaveDraft';
import { api } from '@/lib/http';
import { writingExamSummaries } from '@/data/writing/exam-index';
import { useUserContext } from '@/context/UserContext';
import type {
  WritingExamPrompts,
  WritingScorePayload,
  WritingTaskType,
} from '@/types/writing';

const DEFAULT_DURATION = 60 * 60;
const MIN_WORDS: Record<WritingTaskType, number> = { task1: 150, task2: 250 };
const TASK_META: Record<WritingTaskType, { label: string; minutes: number }> = {
  task1: { label: 'Task 1', minutes: 20 },
  task2: { label: 'Task 2', minutes: 40 },
};
const TASK_ORDER: WritingTaskType[] = ['task1', 'task2'];

const formatClock = (seconds: number) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const countWords = (value: string) => {
  if (!value) return 0;
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

const formatSavedAt = (iso: string | null) => {
  if (!iso) return 'Autosave idle';
  try {
    return `Saved ${new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))}`;
  } catch {
    return 'Saved';
  }
};

type StartResponse = {
  attempt: {
    id: string;
    startedAt?: string | null;
    durationSeconds?: number | null;
  };
  prompts: WritingExamPrompts;
};

type SubmitResult = {
  attemptId: string;
  results: Partial<Record<WritingTaskType, WritingScorePayload>>;
};

type Stage = 'intro' | 'preparing' | 'active' | 'submitting' | 'finished';

const WritingMockCBERunPage: React.FC = () => {
  const router = useRouter();
  const { user } = useUserContext();
  const mockIdParam = typeof router.query.mockId === 'string' ? router.query.mockId : undefined;
  const summary = useMemo(() => {
    if (!writingExamSummaries || writingExamSummaries.length === 0) return null;
    return writingExamSummaries.find((paper) => paper.id === mockIdParam) ?? writingExamSummaries[0];
  }, [mockIdParam]);

  const [stage, setStage] = useState<Stage>('intro');
  const [prompts, setPrompts] = useState<WritingExamPrompts | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(DEFAULT_DURATION);
  const [task1Essay, setTask1Essay] = useState('');
  const [task2Essay, setTask2Essay] = useState('');
  const [activeTask, setActiveTask] = useState<WritingTaskType>('task1');
  const [fontScale, setFontScale] = useState(1);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);
  const [clipboardWarning, setClipboardWarning] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmitResult | null>(null);
  const [keyboardLocale, setKeyboardLocale] = useState('EN');

  const editorRefs = useRef<Record<WritingTaskType, HTMLTextAreaElement | null>>({
    task1: null,
    task2: null,
  });
  const warningTimeoutRef = useRef<number | null>(null);
  const clipboardTimeoutRef = useRef<number | null>(null);
  const warningFlags = useRef({ ten: false, five: false });
  const submittingRef = useRef(false);
  const timerStartedRef = useRef(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      setKeyboardLocale(navigator.language.split('-')[0]?.toUpperCase() ?? 'EN');
    }
  }, []);

  const counts = useMemo(
    () => ({
      task1: countWords(task1Essay),
      task2: countWords(task2Essay),
    }),
    [task1Essay, task2Essay],
  );

  const submitExam = useCallback(
    async () => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      setStage('submitting');
      setSubmissionError(null);
      try {
        const payload: {
          task1?: { essay: string; promptId: string };
          task2?: { essay: string; promptId: string };
        } = {};
        if (prompts?.task1 && task1Essay.trim().length > 0) {
          payload.task1 = { essay: task1Essay, promptId: prompts.task1.id };
        }
        if (prompts?.task2 && task2Essay.trim().length > 0) {
          payload.task2 = { essay: task2Essay, promptId: prompts.task2.id };
        }

        const res = await fetch('/api/mock/writing/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId, durationSeconds, tasks: payload }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Submission failed');
        }
        const data = (await res.json()) as SubmitResult;
        setSubmissionResult(data);
        setStage('finished');
      } catch (error: any) {
        setSubmissionError(error?.message ?? 'Unable to submit responses. A proctor will help.');
      } finally {
        submittingRef.current = false;
      }
    },
    [attemptId, durationSeconds, prompts, task1Essay, task2Essay],
  );

  const timerOptions = useMemo(() => ({ autoStart: false, onFinish: submitExam }), [submitExam]);
  const { timeLeft, start, reset, percentComplete } = useExamTimer(durationSeconds, timerOptions);

  const elapsedSeconds = useMemo(() => {
    if (!attemptId) return 0;
    if (stage === 'active' || stage === 'submitting') {
      return Math.max(0, durationSeconds - timeLeft);
    }
    return 0;
  }, [attemptId, durationSeconds, stage, timeLeft]);

  useEffect(() => {
    if (stage === 'active' && attemptId && !timerStartedRef.current) {
      timerStartedRef.current = true;
      start();
    }
    if (stage === 'intro') {
      timerStartedRef.current = false;
      reset(durationSeconds);
    }
  }, [attemptId, durationSeconds, reset, stage, start]);

  useEffect(() => () => {
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    if (clipboardTimeoutRef.current) window.clearTimeout(clipboardTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (stage !== 'active') return;
    if (timeLeft <= 600 && !warningFlags.current.ten) {
      warningFlags.current.ten = true;
      setWarningNotice('10 minutes remaining');
    } else if (timeLeft <= 300 && !warningFlags.current.five) {
      warningFlags.current.five = true;
      setWarningNotice('5 minutes remaining');
    }
  }, [stage, timeLeft]);

  useEffect(() => {
    if (!warningNotice) return;
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = window.setTimeout(() => setWarningNotice(null), 3000);
  }, [warningNotice]);

  useEffect(() => {
    if (!clipboardWarning) return;
    if (clipboardTimeoutRef.current) window.clearTimeout(clipboardTimeoutRef.current);
    clipboardTimeoutRef.current = window.setTimeout(() => setClipboardWarning(null), 3500);
  }, [clipboardWarning]);

  useEffect(() => {
    if (stage !== 'active') return;
    const editor = editorRefs.current[activeTask];
    if (editor) {
      editor.focus();
    }
  }, [activeTask, stage]);

  const autosavePayload = useMemo(() => {
    const payload: Partial<Record<WritingTaskType, { content: string; wordCount: number }>> = {};
    if (task1Essay.trim().length > 0) {
      payload.task1 = { content: task1Essay, wordCount: counts.task1 };
    }
    if (task2Essay.trim().length > 0) {
      payload.task2 = { content: task2Essay, wordCount: counts.task2 };
    }
    return payload;
  }, [counts.task1, counts.task2, task1Essay, task2Essay]);

  const { state: autosaveState, lastSavedAt } = useAutoSaveDraft({
    attemptId: attemptId ?? 'pending',
    activeTask,
    tasks: autosavePayload,
    elapsedSeconds,
    throttleMs: 2000,
    enabled: stage === 'active' && Boolean(attemptId),
  });

  const handleClipboardBlock = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setClipboardWarning('Copy, cut, and paste are disabled in IELTS exam mode.');
  }, []);

  const handleContextBlock = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setClipboardWarning('Right-click is disabled during the test.');
  }, []);

  const handleStart = useCallback(async () => {
    if (!summary) return;
    if (stage === 'preparing') return;
    setStartError(null);
    setStage('preparing');
    setSubmissionResult(null);
    warningFlags.current = { ten: false, five: false };
    try {
      const payload = await api<StartResponse>('/api/mock/writing/start', {
        method: 'POST',
        body: JSON.stringify({ promptId: summary.id, mockId: summary.id }),
      });
      setPrompts(payload.prompts);
      setAttemptId(payload.attempt.id);
      setAttemptStartedAt(payload.attempt.startedAt ?? new Date().toISOString());
      setDurationSeconds(payload.attempt.durationSeconds ?? DEFAULT_DURATION);
      setTask1Essay('');
      setTask2Essay('');
      setActiveTask('task2');
      setStage('active');
    } catch (error: any) {
      setStage('intro');
      setStartError(error?.error ?? error?.message ?? 'Unable to start the writing test.');
    }
  }, [stage, summary]);

  const decreaseFont = () => setFontScale((prev) => Math.max(0.85, Number((prev - 0.1).toFixed(2))));
  const increaseFont = () => setFontScale((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(2))));

  const applyFormatting = useCallback(
    (style: 'bold' | 'italic') => {
      const editor = editorRefs.current[activeTask];
      if (!editor || stage !== 'active') return;
      const startSel = editor.selectionStart ?? 0;
      const endSel = editor.selectionEnd ?? 0;
      const value = activeTask === 'task1' ? task1Essay : task2Essay;
      const wrapper = style === 'bold' ? '**' : '_';
      const before = value.slice(0, startSel);
      const selected = value.slice(startSel, endSel);
      const after = value.slice(endSel);
      const nextValue = `${before}${wrapper}${selected}${wrapper}${after}`;
      if (activeTask === 'task1') {
        setTask1Essay(nextValue);
      } else {
        setTask2Essay(nextValue);
      }
      requestAnimationFrame(() => {
        const cursor = selected.length > 0 ? before.length + wrapper.length + selected.length : before.length + wrapper.length;
        editor.focus();
        editor.setSelectionRange(cursor, cursor);
      });
    },
    [activeTask, stage, task1Essay, task2Essay],
  );

  const candidateName = user?.user_metadata?.full_name || user?.email || 'Candidate';
  const candidateId = user?.id ? user.id.slice(0, 8).toUpperCase() : '—';

  const autosaveLabel = (() => {
    if (!attemptId || stage === 'intro') return 'Autosave ready';
    if (autosaveState === 'saving') return 'Saving…';
    if (autosaveState === 'error') return 'Autosave issue — reconnecting';
    if (autosaveState === 'saved') return formatSavedAt(lastSavedAt ?? null);
    return 'Autosave ready';
  })();

  const promptLocked = !prompts || (stage !== 'active' && stage !== 'submitting');
  const editingDisabled = stage !== 'active';

  return (
    <>
      <Head>
        <title>IELTS Writing Mock • Computer-Delivered Exam Mode</title>
      </Head>

      <main className="min-h-screen bg-slate-50 pb-16">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {(stage === 'intro' || stage === 'preparing') && summary ? (
            <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">IELTS Writing — Computer Delivered</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{summary.title}</h1>
                <p className="text-base text-slate-600">{summary.description}</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Candidate</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{candidateName}</p>
                  <p className="text-sm text-slate-500">No. {candidateId}</p>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Module</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Writing</p>
                  <p className="text-sm text-slate-500">60 minutes total</p>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Autosave</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Every 2 seconds</p>
                  <p className="text-sm text-slate-500">Timer starts when you click Start Writing</p>
                </Card>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-800">Task rules</p>
                  <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
                    <li>Task 1 — minimum 150 words (recommended 20 minutes).</li>
                    <li>Task 2 — minimum 250 words (recommended 40 minutes).</li>
                    <li>You may answer in any order. Prompts stay on screen.</li>
                    <li>No spell check, grammar check, or copy/paste between tasks.</li>
                  </ul>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-800">What to expect</p>
                  <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
                    <li>Split screen with prompts on the left and editor on the right.</li>
                    <li>Tabs for Task 1 / Task 2 with live word counts.</li>
                    <li>10-minute and 5-minute warnings before auto-submit at 0:00.</li>
                    <li>Responses lock automatically when the timer ends.</li>
                  </ul>
                </Card>
              </div>

              {startError ? (
                <Alert variant="error" className="mt-6" title="Unable to start">
                  {startError}
                </Alert>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-2xl"
                  onClick={handleStart}
                  disabled={stage === 'preparing'}
                >
                  {stage === 'preparing' ? 'Preparing workspace…' : 'Start Writing'}
                </Button>
                <Button variant="ghost" href="/writing/mock" className="rounded-2xl">
                  Back to mock library
                </Button>
              </div>
            </Card>
          ) : null}

          {(stage === 'active' || stage === 'submitting') && !promptLocked ? (
            <div className="mt-6 space-y-4">
              <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">IELTS Writing</p>
                    <h2 className="text-2xl font-semibold text-slate-900">Official-style exam workspace</h2>
                    <p className="text-sm text-slate-600">Timer runs once and the system submits for you. Keep typing — autosave is live.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-4 py-2 font-mono text-2xl text-slate-900">
                        {formatClock(timeLeft)}
                      </span>
                      <Badge variant="neutral">{keyboardLocale} keyboard</Badge>
                    </div>
                    <div className="h-2 w-48 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${percentComplete * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {warningNotice ? (
                <Alert variant="warning" appearance="solid" className="rounded-2xl text-center text-base font-semibold">
                  {warningNotice}
                </Alert>
              ) : null}
              {clipboardWarning ? (
                <Alert variant="warning" className="rounded-2xl">
                  {clipboardWarning}
                </Alert>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="flex max-h-[80vh] flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <header className="pb-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Task prompts</p>
                    <p className="text-sm text-slate-600">Scroll to review both tasks. Use the tabs to switch writing focus.</p>
                  </header>
                  <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto pr-1">
                    {TASK_ORDER.map((taskKey) => {
                      const prompt = prompts?.[taskKey];
                      if (!prompt) return null;
                      return (
                        <Card key={taskKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                {TASK_META[taskKey].label}
                              </p>
                              <p className="text-sm text-slate-500">{prompt.module === 'general_training' ? 'General Training' : 'Academic'} · {TASK_META[taskKey].minutes} min recommended</p>
                            </div>
                            <Badge variant={activeTask === taskKey ? 'primary' : 'neutral'}>
                              {activeTask === taskKey ? 'Active' : 'View'}
                            </Badge>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-slate-900">{prompt.title}</h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {prompt.promptText || 'Prompt unavailable'}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-4 rounded-xl"
                            onClick={() => setActiveTask(taskKey)}
                          >
                            Switch to {TASK_META[taskKey].label}
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs value={activeTask} onValueChange={(val) => setActiveTask(val as WritingTaskType)}>
                      <TabsList className="flex flex-wrap">
                        {TASK_ORDER.map((taskKey) => (
                          <TabsTrigger key={taskKey} value={taskKey} className="flex items-center gap-2 rounded-full px-4 py-2">
                            <span>{TASK_META[taskKey].label}</span>
                            <span className="text-xs text-slate-500">{counts[taskKey]} words</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{autosaveLabel}</span>
                      <span aria-hidden="true" className="text-slate-400">•</span>
                      <span>Zoom</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-sm"
                          onClick={decreaseFont}
                          aria-label="Decrease font size"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-sm"
                          onClick={increaseFont}
                          aria-label="Increase font size"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {TASK_ORDER.map((taskKey) => (
                      <Card key={taskKey} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <p className="font-medium text-slate-800">{TASK_META[taskKey].label}</p>
                          <Badge variant={counts[taskKey] >= MIN_WORDS[taskKey] ? 'success' : 'neutral'}>
                            {counts[taskKey]} / {MIN_WORDS[taskKey]} words
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {counts[taskKey] >= MIN_WORDS[taskKey]
                            ? 'Minimum met'
                            : `Need ${MIN_WORDS[taskKey] - counts[taskKey]} more words`}
                        </p>
                      </Card>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                    No submit button: when the timer reaches 00:00 the editor locks and your responses are submitted automatically.
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700" htmlFor={`task-${activeTask}-response`}>
                        {TASK_META[activeTask].label} response
                      </label>
                      <span className="text-xs text-slate-500">Minimum {MIN_WORDS[activeTask]} words</span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white">
                      {TASK_ORDER.map((taskKey) => (
                        <TextareaAutosize
                          key={taskKey}
                          id={`task-${taskKey}-response`}
                          minRows={18}
                          value={taskKey === 'task1' ? task1Essay : task2Essay}
                          onChange={(event) => {
                            if (editingDisabled) return;
                            if (taskKey === 'task1') {
                              setTask1Essay(event.target.value);
                            } else {
                              setTask2Essay(event.target.value);
                            }
                          }}
                          readOnly={editingDisabled}
                          spellCheck={false}
                          autoCorrect="off"
                          autoCapitalize="off"
                          inputMode="text"
                          onPaste={handleClipboardBlock}
                          onCopy={handleClipboardBlock}
                          onCut={handleClipboardBlock}
                          onContextMenu={handleContextBlock}
                          ref={(node) => {
                            editorRefs.current[taskKey] = node;
                          }}
                          className={clsx(
                            'w-full resize-none rounded-2xl bg-transparent px-5 py-4 text-base text-slate-900 focus:outline-none',
                            activeTask !== taskKey && 'hidden',
                          )}
                          style={{ fontSize: `${fontScale}rem`, lineHeight: 1.6 }}
                        />
                      ))}
                    </div>
                    {counts[activeTask] < MIN_WORDS[activeTask] ? (
                      <p className="text-sm text-amber-600">
                        {MIN_WORDS[activeTask] - counts[activeTask]} more words needed to meet the requirement.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                        onClick={() => applyFormatting('bold')}
                        disabled={editingDisabled}
                      >
                        Bold
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                        onClick={() => applyFormatting('italic')}
                        disabled={editingDisabled}
                      >
                        Italic
                      </button>
                    </div>
                    <span aria-hidden="true" className="text-slate-400">
                      •
                    </span>
                    <span>Word count updates automatically for the active task.</span>
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {stage === 'finished' ? (
            <Card className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Responses saved</h2>
              <p className="mt-3 text-sm text-slate-600">
                The writing module has been submitted. Head to evaluation to see when your AI feedback is ready.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {submissionResult ? (
                  <Button
                    size="lg"
                    className="rounded-2xl"
                    href={`/writing/mock/${submissionResult.attemptId}/evaluating`}
                  >
                    View evaluation screen
                  </Button>
                ) : null}
                <Button variant="ghost" size="lg" className="rounded-2xl" href="/writing/mock">
                  Back to writing mocks
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        {stage === 'submitting' ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Time is up</h3>
              <p className="mt-2 text-sm text-slate-600">Your editor is locked while we save and submit your responses.</p>
              {submissionError ? (
                <Alert variant="error" className="mt-4" title="Submission issue">
                  {submissionError}
                </Alert>
              ) : null}
            </Card>
          </div>
        ) : null}
      </main>
    </>
  );
};

export default WritingMockCBERunPage;
