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
type ZoomLevel = 'sm' | 'md' | 'lg';

// Theme support
type Theme = 'light' | 'dark';
const THEME_KEY = 'rx-reading-theme';
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

  // ===== SIMPLE THEME =====
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return next;
    });
  };

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

  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>('all');

  const [currentPassageIdx, setCurrentPassageIdx] = React.useState(0);
  const [currentQuestionId, setCurrentQuestionId] = React.useState(
    questions[0]?.id ?? null,
  );

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

  // timer tracking
  const durationSeconds = (test.durationSeconds ?? 3600) as number;
  const [remainingSeconds, setRemainingSeconds] =
    React.useState<number>(durationSeconds);

  // ===== SPLIT LAYOUT STATE (DRAGGABLE) =====
  const [splitStep, setSplitStep] = React.useState<number>(3);
  const layoutContainerRef = React.useRef<HTMLDivElement | null>(null);
  const splitDragActiveRef = React.useRef(false);
  const splitBoundsRef = React.useRef<{ left: number; width: number } | null>(null);

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

    const ratio = relativeX / bounds.width;
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
    return () => {
      if (typeof window === 'undefined') return;
      window.removeEventListener('mousemove', handleSplitMouseMove);
      window.removeEventListener('mouseup', handleSplitMouseUp);
    };
  }, []);

  // ===== HYDRATE ZOOM =====
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const zoomRaw = window.localStorage.getItem(ZOOM_KEY) as ZoomLevel | null;
    if (zoomRaw === 'sm' || zoomRaw === 'md' || zoomRaw === 'lg') {
      setZoom(zoomRaw);
    }
  }, []);

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
    if (minutesLeft <= 5 && minutesLeft > 0) {
      setShowTimeWarning(true);
      setTimeWarningShown(true);
    }
  }, [remainingSeconds, readOnly, started, timeWarningShown]);

  // ===== PASSAGE / QUESTION MAPS =====
  const passageIndexById = React.useMemo(() => {
    const m: Record<string, number> = {};
    passages.forEach((p, idx) => {
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
      if (q.passageId && q.passageId !== currentPassage.id) return false;

      const isA = isAnswered(answers[q.id]);
      const isF = flags[q.id] ?? false;

      if (filterStatus === 'flagged' && !isF) return false;
      if (filterStatus === 'unanswered' && isA) return false;

      return true;
    });
  }, [questions, currentPassage, answers, flags, filterStatus]);

  // ===== JUMP / NAV =====
  const handleJump = (id: string) => {
    setCurrentQuestionId(id);
    const q = questionsById[id];

    if (q && q.passageId) {
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
  const currentHighlights = highlightsByPassage[currentPassage.id] ?? [];

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

  // ===== SUBMIT =====
  const submitToServer = async () => {
    if (readOnly) return;
    if (submitting.current) return;
    submitting.current = true;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        const correctA = (q as any).correctAnswer;

        let ok = false;
        if (typeof correctA === 'string') {
          ok = userA === correctA;
        } else if (Array.isArray(correctA)) {
          ok = Array.isArray(userA) &&
            correctA.every((x) => (userA as string[]).includes(x));
        }
        if (ok) correct++;
      }

      const band = readingBandFromRaw(correct, total);
      const startedAt = startTimeRef.current ?? Date.now();
      const durationSec = Math.floor((Date.now() - startedAt) / 1000);

      await supabase.from('reading_attempts').insert({
        user_id: user.id,
        test_id: test.id,
        status: 'submitted',
        duration_seconds: durationSec,
        raw_score: correct,
        band_score: band,
        meta: { flags, answers, highlights: highlightsByPassage },
      });

      if (typeof window !== 'undefined') {
        window.location.href = '/mock/reading';
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message ?? 'Failed to submit',
      });
    } finally {
      submitting.current = false;
    }
  };

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

  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId) ?? 0;

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

  const getQuestionNavProps = React.useCallback(() => {
    const answeredMap: Record<number, boolean> = {};
    const flaggedMap: Record<number, boolean> = {};

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const answer = answers[q.id];
      answeredMap[qNum] = answer != null &&
        (typeof answer === 'string' ? answer.trim() !== '' : true);
      flaggedMap[qNum] = flags[q.id] || false;
    });

    const currentIdx = questions.findIndex(q => q.id === currentQuestionId);

    return {
      totalQuestions: questions.length,
      currentIndex: currentIdx >= 0 ? currentIdx : 0,
      answeredMap,
      flaggedMap,
    };
  }, [questions, answers, flags, currentQuestionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* SIMPLE COMPACT HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleExit} className="gap-1 h-8">
              <Icon name="X" className="h-4 w-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-sm font-medium truncate max-w-[200px] md:max-w-md">
              {test.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-1.5 py-0.5">
              <Button
                size="xs"
                variant={zoom === 'sm' ? 'secondary' : 'ghost'}
                className="h-6 w-6 p-0 text-xs"
                onClick={() => changeZoom('sm')}
              >
                A-
              </Button>
              <Button
                size="xs"
                variant={zoom === 'md' ? 'secondary' : 'ghost'}
                className="h-6 w-6 p-0 text-xs"
                onClick={() => changeZoom('md')}
              >
                A
              </Button>
              <Button
                size="xs"
                variant={zoom === 'lg' ? 'secondary' : 'ghost'}
                className="h-6 w-6 p-0 text-xs"
                onClick={() => changeZoom('lg')}
              >
                A+
              </Button>
            </div>

            {/* Theme Toggle */}
            <Button size="xs" variant="ghost" onClick={toggleTheme} className="h-7 w-7 p-0">
              <Icon name={isDark ? 'sun' : 'moon'} className="h-4 w-4" />
            </Button>

            {/* Progress & Timer */}
            <div className="flex items-center gap-3 text-sm">
              <div className="hidden md:block">
                <span className="text-muted-foreground mr-1">Q:</span>
                <span className="font-semibold">{currentIndex + 1}/{total}</span>
              </div>
              <div className="bg-primary/10 px-3 py-1 rounded-full">
                <span className="text-muted-foreground mr-1 text-xs">⏱️</span>
                <span className="font-mono text-sm font-semibold text-primary">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - FIXED HEIGHT */}
      <div className="flex-1 min-h-0">
        {/* DESKTOP LAYOUT WITH DRAGGABLE SPLIT */}
        <div
          ref={layoutContainerRef}
          className={cn(
            'hidden lg:grid gap-4 h-full px-4 py-3 overflow-hidden',
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
            onAddHighlight={(text) => handleAddHighlight(currentPassage.id, text)}
            onClearHighlights={() => handleClearHighlights(currentPassage.id)}
            zoom={zoom}
          />

          {/* Drag handle */}
          <div
            className="hidden lg:flex items-center justify-center cursor-col-resize select-none"
            onMouseDown={handleSplitMouseDown}
            aria-hidden="true"
          >
            <div className="relative h-[80%] w-px bg-border/60">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/90 px-1.5 py-2 shadow-sm">
                <Icon name="grip-vertical" className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Questions side */}
          <div className="bg-card/95 shadow-sm rounded-lg flex flex-col overflow-hidden border border-border/60">
            <div id="reading-question-nav" className="border-b border-border">
              <QuestionNav
                {...getQuestionNavProps()}
                onChangeQuestion={(index) => {
                  const q = questions[index];
                  if (q) handleJump(q.id);
                }}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
              />
            </div>

            <div
              className={cn(
                'flex-1 overflow-y-auto px-4 py-3 space-y-1',
                zoom === 'sm' && 'text-xs',
                zoom === 'md' && 'text-sm',
                zoom === 'lg' && 'text-base',
              )}
            >
              {visibleQuestions.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground">
                  No questions match the current filter for this passage.
                </Card>
              ) : (
                visibleQuestions.map((q, idx) => {
                  const prevQ = visibleQuestions[idx - 1]; // ✅ pass previous question
                  const isCurrent = q.id === currentQuestionId;
                  const isFlagged = !!flags[q.id];
                  const val = answers[q.id] ?? null;

                  return (
                    <div
                      key={q.id}
                      ref={(el) => { questionRefs.current[q.id] = el; }}
                      className={cn(
                        'rounded-lg transition',
                        isCurrent && 'ring-2 ring-primary/50 bg-primary/5'
                      )}
                    >
                      <ReadingQuestionItem
                        question={q}
                        prevQuestion={prevQ}           // ✅ Pass previous question
                        value={val}
                        onChange={(v) => handleAnswerChange(q.id, v)}
                        isFlagged={isFlagged}
                        onToggleFlag={() => toggleFlag(q.id)}
                        noBorder
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MOBILE / TABLET STACKED */}
        <div className="flex flex-col gap-4 px-4 py-3 lg:hidden h-full overflow-y-auto">
          <ReadingPassagePane
            passage={currentPassage}
            totalPassages={passages.length}
            currentPassageIndex={currentPassageIdx}
            onPrev={goPrevPassage}
            onNext={goNextPassage}
            highlights={currentHighlights}
            onAddHighlight={(text) => handleAddHighlight(currentPassage.id, text)}
            onClearHighlights={() => handleClearHighlights(currentPassage.id)}
            zoom={zoom}
          />

          <Card className="p-3 border-border/70 bg-card/95 shadow-sm">
            <QuestionNav
              {...getQuestionNavProps()}
              onChangeQuestion={(index) => {
                const q = questions[index];
                if (q) handleJump(q.id);
              }}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
            />
          </Card>

          <div className="space-y-1">
            {visibleQuestions.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                No questions match the current filter for this passage.
              </Card>
            ) : (
              visibleQuestions.map((q, idx) => {
                const prevQ = visibleQuestions[idx - 1]; // ✅ pass previous question
                const isCurrent = q.id === currentQuestionId;
                const isFlagged = !!flags[q.id];
                const val = answers[q.id] ?? null;

                return (
                  <div
                    key={q.id}
                    ref={(el) => { questionRefs.current[q.id] = el; }}
                    className={cn(isCurrent && 'ring-2 ring-primary/50 bg-primary/5 rounded-lg')}
                  >
                    <ReadingQuestionItem
                      question={q}
                      prevQuestion={prevQ}           // ✅ Pass previous question
                      value={val}
                      onChange={(v) => handleAnswerChange(q.id, v)}
                      isFlagged={isFlagged}
                      onToggleFlag={() => toggleFlag(q.id)}
                      noBorder
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SIMPLE FOOTER */}
      <footer className="border-t border-border bg-background/95 px-4 py-2">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrevQuestion}
            disabled={currentIndex <= 0}
            className="gap-1"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm">
            <span className="font-medium">{answeredCount}</span>
            <span className="text-muted-foreground">/{total} answered</span>
            {flaggedCount > 0 && (
              <span className="ml-2 text-amber-600">• {flaggedCount} flagged</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goNextQuestion}
              disabled={currentIndex + 1 >= questions.length}
              className="gap-1"
            >
              Next
              <Icon name="chevron-right" className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitClick}
              disabled={readOnly}
              className="ml-2"
            >
              Submit
            </Button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {!readOnly && (
        <ExamStrictModePopup open={!started} onAcknowledge={handleStartTest} />
      )}
      <ExamConfirmPopup
        open={showSubmitConfirm}
        unanswered={unansweredCount}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          void submitToServer();
        }}
      />
      <ExamExitPopup
        open={showExitPopup}
        unanswered={unansweredCount}
        onCancel={() => setShowExitPopup(false)}
        onExit={handleExit}
      />
      <ExamTimeWarningPopup
        open={showTimeWarning}
        remainingMinutes={Math.max(0, Math.floor(remainingSeconds / 60))}
        onClose={() => setShowTimeWarning(false)}
        onJumpToNav={() => {
          const el = document.getElementById('reading-question-nav');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </div>
  );
};

export const ReadingExamShell = ReadingExamShellInner;
export default ReadingExamShellInner;