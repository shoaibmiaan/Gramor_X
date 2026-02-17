// components/writing/WritingExamShell.tsx
import * as React from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Textarea } from '@/components/design-system/Textarea';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

type ExamType = 'Academic' | 'General Training';

type WritingTaskDescriptor = {
  id: string;
  label: 'Task 1' | 'Task 2';
  title: string;
  prompt: string;
  minimumWords: number;
  recommendedMinutes: number;
};

type WritingExamShellProps = {
  testTitle: string;
  examType: ExamType;
  totalDurationMinutes: number;
  tasks: WritingTaskDescriptor[];
  initialAnswers?: Record<string, string | null>;
  onSubmit: (payload: {
    answers: {
      taskId: string;
      label: 'Task 1' | 'Task 2';
      text: string;
      wordCount: number;
    }[];
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export const WritingExamShell: React.FC<WritingExamShellProps> = ({
  testTitle,
  examType,
  totalDurationMinutes,
  tasks,
  initialAnswers,
  onSubmit,
  isSubmitting,
  disabled,
}) => {
  const [activeTaskId, setActiveTaskId] = React.useState(
    () => tasks[0]?.id ?? '',
  );

  const [answers, setAnswers] = React.useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const t of tasks) {
      base[t.id] = (initialAnswers?.[t.id] ?? '').toString();
    }
    return base;
  });

  const [remainingSeconds, setRemainingSeconds] = React.useState(
    totalDurationMinutes * 60,
  );
  const [hasExpired, setHasExpired] = React.useState(false);

  // Timer
  React.useEffect(() => {
    if (remainingSeconds <= 0) {
      setHasExpired(true);
      return;
    }

    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setHasExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [remainingSeconds]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? tasks[0];

  const handleChange = (taskId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [taskId]: value,
    }));
  };

  const wordCount = (text: string) => {
    const normalized = text
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return 0;
    return normalized.split(' ').length;
  };

  const activeWordCount = activeTask ? wordCount(answers[activeTask.id] ?? '') : 0;
  const timerMinutes = Math.floor(remainingSeconds / 60);
  const timerSeconds = remainingSeconds % 60;

  const handleSubmit = async () => {
    const payload = tasks.map((t) => {
      const text = answers[t.id] ?? '';
      return {
        taskId: t.id,
        label: t.label,
        text,
        wordCount: wordCount(text),
      };
    });

    await onSubmit({ answers: payload });
  };

  const canSubmit = !disabled && !isSubmitting;

  return (
    <div className="flex flex-col gap-4">
      {/* TOP BAR: test meta + timer + exam info */}
      <Card className="rounded-ds-2xl border border-border/60 bg-card/90 px-4 py-3 md:px-5 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-slab text-base md:text-lg font-semibold">
                {testTitle}
              </h1>
              <Badge size="xs" variant="info">
                {examType} · Writing
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Finish both tasks within the total time. No autosave excuses later.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <div className="flex items-center gap-2 rounded-ds-full bg-muted px-3 py-1">
              <Icon
                name={hasExpired ? 'AlertTriangle' : 'Timer'}
                size={14}
                className={cn(
                  'shrink-0',
                  hasExpired ? 'text-danger' : 'text-primary',
                )}
              />
              <span
                className={cn(
                  'tabular-nums text-xs font-medium',
                  hasExpired ? 'text-danger' : 'text-foreground',
                )}
              >
                {timerMinutes.toString().padStart(2, '0')}:
                {timerSeconds.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex flex-col items-end text-[11px] text-muted-foreground">
              <span>Total time: {totalDurationMinutes} minutes</span>
              <span>Tasks: {tasks.length}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* TASK TABS */}
      <Card className="rounded-ds-2xl border border-border/60 bg-card/90 px-3 py-2 md:px-4 md:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {tasks.map((t) => {
              const isActive = t.id === activeTask.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-ds-full px-3 py-1.5 text-xs font-medium transition',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                  onClick={() => setActiveTaskId(t.id)}
                >
                  <span>{t.label}</span>
                  <span className="h-4 w-px bg-border/60" />
                  <span>{t.minimumWords}+ words</span>
                </button>
              );
            })}
          </div>

          {activeTask && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Icon name="Clock" size={12} />
              <span>Recommended: {activeTask.recommendedMinutes} minutes</span>
            </div>
          )}
        </div>
      </Card>

      {/* MAIN EXAM GRID */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        {/* PROMPT PANEL */}
        <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge size="xs" variant="neutral">
                {activeTask?.label ?? 'Task'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Respond to all parts of the task clearly.
              </p>
            </div>
          </div>

          <div className="rounded-ds-xl bg-muted px-3 py-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {activeTask?.prompt ?? 'No prompt available.'}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Use the right tone ({examType === 'Academic' ? 'formal' : 'semi-formal'})
            and keep ideas logical. No story-writing.
          </p>
        </Card>

        {/* ANSWER PANEL */}
        <Card className="rounded-ds-2xl border border-border/60 bg-card/90 p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Your answer
            </p>

            {activeTask && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Icon name="ListChecks" size={12} />
                <span>
                  {activeWordCount} / {activeTask.minimumWords} words
                </span>
                {activeWordCount < activeTask.minimumWords ? (
                  <Badge size="xs" variant="danger">
                    Below minimum
                  </Badge>
                ) : (
                  <Badge size="xs" variant="success">
                    OK
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex-1">
            <Textarea
              value={activeTask ? answers[activeTask.id] ?? '' : ''}
              onChange={(e) =>
                activeTask && handleChange(activeTask.id, e.target.value)
              }
              className="h-[320px] resize-none text-sm"
              placeholder="Start writing your response here..."
              disabled={disabled || hasExpired || isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-muted-foreground">
              No bullet points. Use clear paragraphs. Spelling mistakes count.
            </p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Auto word count · {activeWordCount} words
            </p>
          </div>
        </Card>
      </div>

      {/* SUBMIT FOOTER */}
      <div className="sticky bottom-0 z-20 mt-4 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-2 py-3 md:px-0 md:py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col text-[11px] text-muted-foreground">
              <span>
                Once you submit, this attempt will be locked and sent for
                scoring/feedback.
              </span>
              {hasExpired && (
                <span className="text-danger">
                  Time is up. You can still submit, but this will be treated as
                  late in analytics.
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-ds-xl"
                asChild
              >
                <Link href="/mock/writing">Exit without submitting</Link>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                className="rounded-ds-xl"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Writing attempt'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
