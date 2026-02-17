// components/reading/ReadingExamShell.tsx
import * as React from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import TimerProgress from '@/components/reading/TimerProgress';
import { ReadingPassagePane } from './ReadingPassagePane';
import { ReadingQuestionItem } from './ReadingQuestionItem';
import { QuestionNav } from './QuestionNav';

import type {
  ReadingTest,
  ReadingPassage,
  ReadingQuestion,
} from '@/lib/reading/types';

import { supabase } from '@/lib/supabaseClient';
import { readingBandFromRaw } from '@/lib/reading/band';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/design-system/Toaster';

import { ExamHeader } from '@/components/exam/ExamHeader';
import {
  ExamBreadcrumbs,
  type ExamBreadcrumbItem,
} from '@/components/exam/ExamBreadcrumbs';
import { ExamFooter } from '@/components/exam/ExamFooter';
import { Icon } from '@/components/design-system/Icon';

// NEW STRICT CBE MODALS
import { ExamConfirmPopup } from '@/components/exam/ExamConfirmPopup';
import { ExamStrictModePopup } from '@/components/exam/ExamStrictModePopup';
import { ExamExitPopup } from '@/components/exam/ExamExitPopup';
import { ExamTimeWarningPopup } from '@/components/exam/ExamTimeWarningPopup';

type Props = {
  test: ReadingTest;
  passages: ReadingPassage[];
  questions: ReadingQuestion[];
  /** Optional: if true, disables submit + instructions (for future review mode) */
  readOnly?: boolean;
};

type AnswerValue = string | string[] | Record<string, any> | null;

type FilterStatus = 'all' | 'flagged' | 'unanswered';
type FilterType = 'all' | 'tfng' | 'ynng' | 'mcq' | 'gap' | 'match';
type ZoomLevel = 'sm' | 'md' | 'lg';

// Theme support
type Theme = 'light' | 'dark' | 'system';
const THEME_KEY = 'rx-reading-theme';
const FOCUS_KEY = 'rx-reading-focus';
const ZOOM_KEY = 'rx-reading-zoom';

// Split layout support (draggable)
const SPLIT_KEY = 'rx-reading-split-step';

// 7 steps from "passage wide" to "questions wide"
const SPLIT_LAYOUT_CLASSES = [
  'lg:grid-cols-[minmax(0,1.7fr)_10px_minmax(0,1fr)]',
  'lg:grid-cols-[minmax(0,1.5fr)_10px_minmax(0,1fr)]',
  'lg:grid-cols-[minmax(0,1.3fr)_10px_minmax(0,1fr)]',
  'lg:grid-cols-[minmax(0,1.15fr)_10px_minmax(0,1.15fr)]',
  'lg:grid-cols-[minmax(0,1.1fr)_10px_minmax(0,1.3fr)]',
  'lg:grid-cols-[minmax(0,1.0fr)_10px_minmax(0,1.5fr)]',
  'lg:grid-cols-[minmax(0,1.0fr)_10px_minmax(0,1.7fr)]',
] as const;

const splitStepFromRatio = (ratio: number): number => {
  const steps = SPLIT_LAYOUT_CLASSES.length;
  const min = 0.3;
  const max = 0.7;
  const clamped = Math.min(max, Math.max(min, ratio));
  const t = (clamped - min) / (max - min);
  const raw = Math.round(t * (steps - 1));
  return Math.min(steps - 1, Math.max(0, raw));
};

const isAnswered = (value: AnswerValue) => {
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value).some(
      (v) => (v ?? '').toString().trim() !== '',
    );
  }
  return false;
};

const ReadingExamShellInner: React.FC<Props> = ({
  test,
  passages,
  questions,
  readOnly = false,
}) => {
  const toast = useToast();

  // ===== THEME / SYSTEM DARK =====
  const [theme, setTheme] = React.useState<Theme>('system');
  const [systemPrefersDark, setSystemPrefersDark] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setTheme(saved);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    const effectiveDark =
      theme === 'dark' || (theme === 'system' && systemPrefersDark);
    root.classList.add(effectiveDark ? 'dark' : 'light');
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, systemPrefersDark]);

  const toggleTheme = () => {
    setTheme((prev) =>
      prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light',
    );
  };

  const isDark =
    theme === 'dark' || (theme === 'system' && systemPrefersDark);

  if (!questions.length || !passages.length) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        This Reading test does not have passages or questions configured yet.
      </Card>
    );
  }

  // ===== CORE STATE =====
  const [answers, setAnswers] = React.useState<Record<string, AnswerValue>>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});

  const [statusFilter, setStatusFilter] =
    React.useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = React.useState<FilterType>('all');

  const [currentPassageIdx, setCurrentPassageIdx] = React.useState(0);
  const [currentQuestionId, setCurrentQuestionId] = React.useState(
    questions[0]?.id ?? null,
  );

  const [focusMode, setFocusMode] = React.useState(false);
  const [zoom, setZoom] = React.useState<ZoomLevel>('md');

  const [highlightsByPassage, setHighlightsByPassage] = React.useState<
    Record<string, string[]>
  >({});

  const [started, setStarted] = React.useState(readOnly);

  const questionRefs =
    React.useRef<Record<string, HTMLDivElement | null>>({});

  const startTimeRef = React.useRef<number | null>(null);
  const submitting = React.useRef(false);

  // strict CBE modals
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);
  const [showExitPopup, setShowExitPopup] = React.useState(false);
  const [showTimeWarning, setShowTimeWarning] = React.useState(false);
  const [timeWarningShown, setTimeWarningShown] = React.useState(false);

  // timer tracking for warning popup (does NOT control TimerProgress)
  // @ts-expect-error reading type shape
  const durationSeconds = (test.durationSeconds ?? 3600) as number;
  const [remainingSeconds, setRemainingSeconds] =
    React.useState<number>(durationSeconds);

  // ===== SPLIT LAYOUT STATE (DRAGGABLE) =====
  const [splitStep, setSplitStep] = React.useState<number>(3); // 0..6, 3 ≈ balanced
  const layoutContainerRef = React.useRef<HTMLDivElement | null>(null);
  const splitDragActiveRef = React.useRef(false);
  const splitBoundsRef = React.useRef<{ left: number; width: number } | null>(
    null,
  );

  // hydrate saved split step
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(SPLIT_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    if (parsed >= 0 && parsed < SPLIT_LAYOUT_CLASSES.length) {
      setSplitStep(parsed);
    }
  }, []);

  const handleSplitMouseMove = (event: MouseEvent) => {
    if (!splitDragActiveRef.current) return;
    const bounds = splitBoundsRef.current;
    if (!bounds) return;

    const relativeX = event.clientX - bounds.left;
    if (relativeX <= 0 || relativeX >= bounds.width) return;

    const ratio = relativeX / bounds.width; // 0..1
    const step = splitStepFromRatio(ratio);

    setSplitStep((prev) => {
      if (prev === step) return prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SPLIT_KEY, String(step));
      }
      return step;
    });
  };

  const handleSplitMouseUp = () => {
    if (!splitDragActiveRef.current) return;
    splitDragActiveRef.current = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleSplitMouseMove);
      window.removeEventListener('mouseup', handleSplitMouseUp);
    }
  };

  const handleSplitMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (typeof window === 'undefined') return;
    if (!layoutContainerRef.current) return;

    const rect = layoutContainerRef.current.getBoundingClientRect();
    splitBoundsRef.current = { left: rect.left, width: rect.width };
    splitDragActiveRef.current = true;

    window.addEventListener('mousemove', handleSplitMouseMove);
    window.addEventListener('mouseup', handleSplitMouseUp);

    event.preventDefault();
  };

  React.useEffect(() => {
    // safety cleanup on unmount
    return () => {
      if (typeof window === 'undefined') return;
      window.removeEventListener('mousemove', handleSplitMouseMove);
      window.removeEventListener('mouseup', handleSplitMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== HYDRATE PREFS =====
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const focusRaw = window.localStorage.getItem(FOCUS_KEY);
    if (focusRaw === '1') setFocusMode(true);

    const zoomRaw = window.localStorage.getItem(ZOOM_KEY) as
      | ZoomLevel
      | null;
    if (zoomRaw === 'sm' || zoomRaw === 'md' || zoomRaw === 'lg') {
      setZoom(zoomRaw);
    }
  }, []);

  const toggleFocus = () => {
    setFocusMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(FOCUS_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const changeZoom = (level: ZoomLevel) => {
    setZoom(level);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ZOOM_KEY, level);
    }
  };

  // internal countdown for time warning popup
  React.useEffect(() => {
    if (readOnly || !started) return;
    if (typeof window === 'undefined') return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [started, readOnly]);

  React.useEffect(() => {
    if (readOnly || !started || timeWarningShown) return;
    const minutesLeft = Math.floor(remainingSeconds / 60);
    if (minutesLeft <= 5) {
      setShowTimeWarning(true);
      setTimeWarningShown(true);
    }
  }, [remainingSeconds, readOnly, started, timeWarningShown]);

  // ===== PASSAGE / QUESTION MAPS =====
  const passageIndexById = React.useMemo(() => {
    const m: Record<string, number> = {};
    passages.forEach((p, idx) => {
      // @ts-expect-error reading type shape
      m[p.id as string] = idx;
    });
    return m;
  }, [passages]);

  const questionsById = React.useMemo(() => {
    const m: Record<string, ReadingQuestion> = {};
    questions.forEach((q) => {
      m[q.id] = q;
    });
    return m;
  }, [questions]);

  const currentPassage = passages[currentPassageIdx];

  // ===== COUNTERS =====
  const total = questions.length;
  const answeredCount = React.useMemo(
    () => questions.filter((q) => isAnswered(answers[q.id])).length,
    [questions, answers],
  );
  const unansweredCount = total - answeredCount;

  const flaggedCount = React.useMemo(
    () => Object.values(flags).filter(Boolean).length,
    [flags],
  );

  // ===== FILTERED QUESTIONS =====
  const visibleQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      // only show current passage
      // @ts-expect-error reading type
      if (q.passageId && q.passageId !== currentPassage.id) return false;

      // type filter
      // @ts-expect-error reading type
      const type = (q.questionTypeId ?? 'all') as FilterType;
      if (typeFilter !== 'all' && type !== typeFilter) return false;

      const val = answers[q.id];
      const isA = isAnswered(val);
      const isF = flags[q.id] ?? false;

      if (statusFilter === 'flagged' && !isF) return false;
      if (statusFilter === 'unanswered' && isA) return false;

      return true;
    });
  }, [
    questions,
    currentPassage,
    answers,
    flags,
    statusFilter,
    typeFilter,
  ]);

  // ===== JUMP / NAV =====
  const handleJump = (id: string) => {
    setCurrentQuestionId(id);
    const q = questionsById[id];

    // passage sync
    // @ts-expect-error reading type
    if (q && q.passageId) {
      // @ts-expect-error reading type
      const idx = passageIndexById[q.passageId as string];
      if (typeof idx === 'number') setCurrentPassageIdx(idx);
    }

    const el = questionRefs.current[id];
    if (el && typeof window !== 'undefined') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goNextPassage = () => {
    setCurrentPassageIdx((idx) =>
      idx + 1 < passages.length ? idx + 1 : idx,
    );
  };

  const goPrevPassage = () => {
    setCurrentPassageIdx((idx) => (idx > 0 ? idx - 1 : idx));
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleFlag = (questionId: string) => {
    setFlags((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // ===== HIGHLIGHTS =====
  const currentHighlights =
    highlightsByPassage[currentPassage.id] ?? [];

  const handleAddHighlight = (passageId: string, text: string) => {
    if (!text.trim()) return;
    setHighlightsByPassage((prev) => {
      const existing = prev[passageId] ?? [];
      if (existing.includes(text)) return prev;
      return {
        ...prev,
        [passageId]: [...existing, text],
      };
    });
  };

  const handleClearHighlights = (passageId: string) => {
    setHighlightsByPassage((prev) => ({
      ...prev,
      [passageId]: [],
    }));
  };

  // ===== SUBMIT (CORE) =====
  const submitToServer = async () => {
    if (readOnly) return;
    if (submitting.current) return;
    submitting.current = true;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch user', userError);
      }
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Not signed in',
          description: 'You must be logged in to submit this mock.',
        });
        submitting.current = false;
        return;
      }

      let correct = 0;
      for (const q of questions) {
        const userA = answers[q.id];
        // @ts-expect-error reading type
        const correctA = q.correctAnswer;

        let ok = false;
        if (typeof correctA === 'string') {
          ok = userA === correctA;
        } else if (Array.isArray(correctA)) {
          ok =
            Array.isArray(userA) &&
            correctA.every((x) => (userA as string[]).includes(x));
        }
        if (ok) correct++;
      }

      const band = readingBandFromRaw(correct, total);
      const startedAt = startTimeRef.current ?? Date.now();
      const durationSec = Math.floor((Date.now() - startedAt) / 1000);

      const { data: attemptRow, error: attemptError } = await supabase
        .from('reading_attempts')
        .insert({
          user_id: user.id,
          // @ts-expect-error reading type
          test_id: test.id,
          status: 'submitted',
          duration_seconds: durationSec,
          raw_score: correct,
          band_score: band,
          section_stats: {},
          meta: {
            flags,
            answers,
            highlights: highlightsByPassage,
          },
        })
        .select()
        .maybeSingle();

      if (attemptError || !attemptRow) {
        // eslint-disable-next-line no-console
        console.error('Failed to insert reading_attempt', attemptError);
        const message = attemptError?.message ?? '';

        if (message.includes('uq_reading_attempt_in_progress')) {
          toast({
            variant: 'destructive',
            title: 'Attempt already in progress',
            description:
              'You already have an active attempt for this test. Refresh the page or open it from your attempts history.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to submit attempt',
            description:
              message ||
              'Something went wrong while saving your attempt. Please try again.',
          });
        }

        submitting.current = false;
        return;
      }

      const attemptId: string = (attemptRow as any).id;
      if (typeof window !== 'undefined') {
        window.location.href = `/mock/reading/result/${attemptId}`;
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Unexpected error during reading submit', err);
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description:
          err?.message ??
          'An unexpected error occurred while submitting your attempt.',
      });
    } finally {
      submitting.current = false;
    }
  };

  // ===== SUBMIT BUTTON HANDLER =====
  const handleSubmitClick = () => {
    if (readOnly) return;

    if (answeredCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot submit yet',
        description: 'Answer at least one question before submitting.',
      });
      return;
    }

    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
      return;
    }

    void submitToServer();
  };

  // ===== NAV helpers =====
  const currentIndex =
    questions.findIndex((q) => q.id === currentQuestionId) ?? 0;

  const goPrevQuestion = () => {
    if (currentIndex <= 0) return;
    handleJump(questions[currentIndex - 1].id);
  };

  const goNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) return;
    handleJump(questions[currentIndex + 1].id);
  };

  const handleStartTest = () => {
    startTimeRef.current = Date.now();
    setStarted(true);
  };

  const handleExit = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/mock/reading';
    }
  };

  // ===== LABELS =====
  const examTypeLabel =
    // @ts-expect-error reading type
    test.examType === 'gt'
      ? 'IELTS Reading · General Training'
      : 'IELTS Reading · Academic';

  const breadcrumbs: ExamBreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Mocks', href: '/mock' },
    { label: 'Reading', href: '/mock/reading' },
    { label: test.title, active: true },
  ];

  const durationMinutes = Math.round(durationSeconds / 60);

  return (
    <div
      className={cn(
        'w-full border border-border/70 rounded-xl bg-background/95 shadow-sm overflow-hidden flex flex-col transition-colors duration-300',
        focusMode && 'ring-2 ring-primary/40 bg-background',
      )}
    >
      {/* HEADER */}
      <div className="sticky top-0 z-40">
        <div
          className={cn(
            'border-b border-border/70 shadow-sm',
            isDark
              ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950'
              : 'bg-gradient-to-r from-blue-50 via-white to-blue-50',
          )}
        >
          <div className="px-3 py-2 sm:px-4 sm:py-2 border-b border-white/5">
            <ExamBreadcrumbs items={breadcrumbs} />
          </div>

          <ExamHeader
            breadcrumbs={undefined}
            examLabel={examTypeLabel}
            title={test.title}
            subtitle={
              test.description ??
              'Three passages, 40 questions. Strict timing, auto-saving, exam-style layout.'
            }
            metaLeft={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Icon name="file-text" className="h-3.5 w-3.5" />
                  {total} questions
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="book-open" className="h-3.5 w-3.5" />
                  {passages.length} passages
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {durationMinutes} minutes
                </span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <Icon name="flag" className="h-3.5 w-3.5" />
                  {flaggedCount} flagged
                </span>
              </div>
            }
            metaRight={
              <div className="flex flex-col items-end gap-2">
                {/* Theme Toggle + Zoom + Focus */}
                <div className="flex items-center gap-1">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={toggleTheme}
                    className="h-7 w-7"
                  >
                    <Icon
                      name={isDark ? 'moon' : 'sun'}
                      className="h-4 w-4"
                    />
                  </Button>

                  <div className="flex items-center gap-1 rounded-full border border-primary/50 bg-background/80 px-2 py-0.5 shadow-sm">
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Zoom
                    </span>
                    <Button
                      size="xs"
                      variant={zoom === 'sm' ? 'secondary' : 'ghost'}
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => changeZoom('sm')}
                    >
                      S
                    </Button>
                    <Button
                      size="xs"
                      variant={zoom === 'md' ? 'secondary' : 'ghost'}
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => changeZoom('md')}
                    >
                      M
                    </Button>
                    <Button
                      size="xs"
                      variant={zoom === 'lg' ? 'secondary' : 'ghost'}
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => changeZoom('lg')}
                    >
                      L
                    </Button>

                    <span className="mx-1 h-4 w-px bg-border/60" />

                    <Button
                      size="xs"
                      variant={focusMode ? 'primary' : 'outline'}
                      className="h-6 px-2 text-[10px] font-semibold"
                      onClick={toggleFocus}
                    >
                      {focusMode ? 'Focus on' : 'Focus mode'}
                    </Button>
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-semibold tracking-wide text-primary/80 uppercase">
                      Time remaining
                    </span>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums">
                      <TimerProgress total={total} />
                    </div>
                  </div>
                </div>
              </div>
            }
            onExitHref="/mock/reading"
            onExitClick={() => setShowExitPopup(true)}
          />
        </div>
      </div>

      {/* DESKTOP LAYOUT WITH DRAGGABLE SPLIT */}
      <div
        ref={layoutContainerRef}
        className={cn(
          'hidden lg:grid gap-4 h-[calc(100vh-190px)] px-4 py-3 overflow-hidden',
          SPLIT_LAYOUT_CLASSES[splitStep],
        )}
      >
        {/* Passage side */}
        <ReadingPassagePane
          passage={currentPassage}
          totalPassages={passages.length}
          currentPassageIndex={currentPassageIdx}
          onPrev={goPrevPassage}
          onNext={goNextPassage}
          highlights={currentHighlights}
          onAddHighlight={(text) =>
            handleAddHighlight(currentPassage.id, text)
          }
          onClearHighlights={() =>
            handleClearHighlights(currentPassage.id)
          }
          zoom={zoom}
        />

        {/* Drag handle */}
        <div
          className="hidden lg:flex items-center justify-center cursor-col-resize select-none"
          onMouseDown={handleSplitMouseDown}
          aria-hidden="true"
        >
          <div className="relative h-[80%] w-px bg-border/60">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/90 px-1.5 py-2 shadow-sm flex items-center justify-center">
              <Icon
                name="grip-vertical"
                className="h-3 w-3 text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Questions side */}
        <div className="bg-card/95 shadow-sm rounded-lg flex flex-col overflow-hidden border border-border/60">
          <div id="reading-question-nav">
            <QuestionNav
              questions={questions}
              answers={answers}
              flags={flags}
              currentQuestionId={currentQuestionId}
              onJump={handleJump}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              setStatusFilter={setStatusFilter}
              setTypeFilter={setTypeFilter}
            />
          </div>

          <div
            className={cn(
              'flex-1 overflow-y-auto px-4 py-4 space-y-4',
              isDark ? 'bg-background/80' : 'bg-white',
              zoom === 'sm' && 'text-xs',
              zoom === 'md' && 'text-sm',
              zoom === 'lg' && 'text-base',
            )}
          >
            {visibleQuestions.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                No questions match the current filters for this passage.
              </Card>
            ) : (
              visibleQuestions.map((q) => {
                const isCurrent = q.id === currentQuestionId;
                const isFlagged = !!flags[q.id];
                const val = answers[q.id] ?? null;

                return (
                  <div
                    key={q.id}
                    ref={(el) => {
                      questionRefs.current[q.id] = el;
                    }}
                    className={cn(
                      'rounded-lg transition ring-0',
                      isCurrent
                        ? isDark
                          ? 'ring-1 ring-primary/70 bg-primary/10'
                          : 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    <ReadingQuestionItem
                      question={q}
                      value={val}
                      onChange={(v) => handleAnswerChange(q.id, v)}
                      isFlagged={isFlagged}
                      onToggleFlag={() => toggleFlag(q.id)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET STACKED */}
      <div className="flex flex-col gap-4 px-4 py-3 lg:hidden">
        <ReadingPassagePane
          passage={currentPassage}
          totalPassages={passages.length}
          currentPassageIndex={currentPassageIdx}
          onPrev={goPrevPassage}
          onNext={goNextPassage}
          highlights={currentHighlights}
          onAddHighlight={(text) =>
            handleAddHighlight(currentPassage.id, text)
          }
          onClearHighlights={() =>
            handleClearHighlights(currentPassage.id)
          }
          zoom={zoom}
        />

        <Card
          className="p-3 border-border/70 bg-card/95 shadow-sm"
          id="reading-question-nav"
        >
          <QuestionNav
            questions={questions}
            answers={answers}
            flags={flags}
            currentQuestionId={currentQuestionId}
            onJump={handleJump}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            setStatusFilter={setStatusFilter}
            setTypeFilter={setTypeFilter}
          />
        </Card>

        <div
          className={cn(
            'space-y-3',
            zoom === 'sm' && 'text-xs',
            zoom === 'md' && 'text-sm',
            zoom === 'lg' && 'text-base',
          )}
        >
          {visibleQuestions.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              No questions match the current filters for this passage.
            </Card>
          ) : (
            visibleQuestions.map((q) => {
              const isCurrent = q.id === currentQuestionId;
              const isFlagged = !!flags[q.id];
              const val = answers[q.id] ?? null;

              return (
                <div
                  key={q.id}
                  ref={(el) => {
                    questionRefs.current[q.id] = el;
                  }}
                  className={cn(
                    'rounded-lg transition ring-0',
                    isCurrent
                      ? isDark
                        ? 'ring-1 ring-primary/70 bg-primary/10'
                        : 'ring-2 ring-blue-500 bg-blue-50'
                      : 'p-0',
                  )}
                >
                  <ReadingQuestionItem
                    question={q}
                    value={val}
                    onChange={(v) => handleAnswerChange(q.id, v)}
                    isFlagged={isFlagged}
                    onToggleFlag={() => toggleFlag(q.id)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FOOTER */}
      <ExamFooter
        currentQuestion={currentIndex + 1}
        totalQuestions={total}
        primaryLabel={readOnly ? 'Review only' : 'Submit attempt'}
        onPrimaryClick={readOnly ? undefined : handleSubmitClick}
        primaryDisabled={readOnly}
        secondaryLabel={currentIndex > 0 ? 'Previous question' : undefined}
        onSecondaryClick={currentIndex > 0 ? goPrevQuestion : undefined}
      />

      {/* STRICT MODE POPUP */}
      {!readOnly && (
        <ExamStrictModePopup
          open={!started}
          onAcknowledge={handleStartTest}
        />
      )}

      {/* SUBMIT CONFIRM POPUP */}
      <ExamConfirmPopup
        open={showSubmitConfirm}
        unanswered={unansweredCount}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          void submitToServer();
        }}
      />

      {/* EXIT TEST POPUP */}
      <ExamExitPopup
        open={showExitPopup}
        unanswered={unansweredCount}
        onCancel={() => setShowExitPopup(false)}
        onExit={handleExit}
      />

      {/* TIME WARNING POPUP */}
      <ExamTimeWarningPopup
        open={showTimeWarning}
        remainingMinutes={Math.max(
          0,
          Math.floor(remainingSeconds / 60),
        )}
        onClose={() => setShowTimeWarning(false)}
        onJumpToNav={() => {
          if (typeof document !== 'undefined') {
            const el = document.getElementById('reading-question-nav');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }}
      />
    </div>
  );
};

export const ReadingExamShell = ReadingExamShellInner;
export default ReadingExamShellInner;
