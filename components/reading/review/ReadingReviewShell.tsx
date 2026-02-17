import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

import type {
  ReadingTest,
  ReadingPassage,
  ReadingQuestion,
} from '@/lib/reading/types';

type ReviewAnswer = {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string | string[] | null;
};

type AttemptForReview = {
  id: string;
  rawScore: number | null;
  bandScore: number | null;
  questionCount: number | null;
  createdAt: string;
  durationSeconds: number | null;
};

type ReadingReviewShellProps = {
  test: ReadingTest;
  passages: ReadingPassage[];
  questions: ReadingQuestion[];
  attempt: AttemptForReview;
  answers: ReviewAnswer[];
};

type CorrectnessFilter = 'all' | 'correct' | 'wrong' | 'unanswered';

export const ReadingReviewShell: React.FC<ReadingReviewShellProps> = ({
  passages,
  questions,
  answers,
}) => {
  const [correctnessFilter, setCorrectnessFilter] =
    React.useState<CorrectnessFilter>('all');
  const [tagFilter, setTagFilter] = React.useState<string>('all');

  const answersMap = React.useMemo(() => {
    const map = new Map<string, ReviewAnswer>();
    for (const ans of answers) {
      map.set(ans.questionId, ans);
    }
    return map;
  }, [answers]);

  const questionsByPassage = React.useMemo(() => {
    const grouped: Record<string, ReadingQuestion[]> = {};
    for (const q of questions) {
      if (!q.passageId) continue;
      if (!grouped[q.passageId]) grouped[q.passageId] = [];
      grouped[q.passageId].push(q);
    }
    Object.values(grouped).forEach((arr) =>
      arr.sort((a, b) => (a.questionOrder ?? 0) - (b.questionOrder ?? 0)),
    );
    return grouped;
  }, [questions]);

  const sortedPassages = React.useMemo(
    () =>
      [...passages].sort(
        (a, b) => (a.passageOrder ?? 0) - (b.passageOrder ?? 0),
      ),
    [passages],
  );

  const availableTags = React.useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      q.tags?.forEach((t) => {
        if (t) set.add(t);
      });
    });
    return Array.from(set).sort();
  }, [questions]);

  const resetFilters = () => {
    setCorrectnessFilter('all');
    setTagFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col gap-3 border-b border-border/60 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Filter questions
          </span>

          <div className="inline-flex items-center gap-1 rounded-ds-full bg-background/70 p-1">
            <Button
              type="button"
              size="xs"
              variant={correctnessFilter === 'all' ? 'primary' : 'ghost'}
              className="h-6 px-2 text-[11px]"
              onClick={() => setCorrectnessFilter('all')}
            >
              All
            </Button>
            <Button
              type="button"
              size="xs"
              variant={correctnessFilter === 'wrong' ? 'primary' : 'ghost'}
              className="h-6 px-2 text-[11px]"
              onClick={() => setCorrectnessFilter('wrong')}
            >
              Wrong
            </Button>
            <Button
              type="button"
              size="xs"
              variant={correctnessFilter === 'correct' ? 'primary' : 'ghost'}
              className="h-6 px-2 text-[11px]"
              onClick={() => setCorrectnessFilter('correct')}
            >
              Correct
            </Button>
            <Button
              type="button"
              size="xs"
              variant={correctnessFilter === 'unanswered' ? 'primary' : 'ghost'}
              className="h-6 px-2 text-[11px]"
              onClick={() => setCorrectnessFilter('unanswered')}
            >
              Unanswered
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Tag</span>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="h-7 rounded-ds-full border border-border/60 bg-background px-2 text-[11px] text-foreground focus:outline-none"
            >
              <option value="all">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={resetFilters}
          >
            <Icon name="XCircle" size={12} className="mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* ===== PASSAGES WITH COLLAPSIBLE QUESTIONS ===== */}
      {sortedPassages.map((passage, idx) => {
        const passageQuestions = questionsByPassage[passage.id] ?? [];

        // Apply filters per passage
        const visibleQuestions = passageQuestions.filter((q) => {
          const ans = answersMap.get(q.id);
          const isCorrect = ans?.isCorrect ?? false;
          const isAnswered = ans && ans.selectedAnswer != null;

          if (correctnessFilter === 'correct' && !isCorrect) return false;
          if (correctnessFilter === 'wrong' && isCorrect) return false;
          if (correctnessFilter === 'unanswered' && isAnswered) return false;

          if (tagFilter !== 'all') {
            if (!q.tags || !q.tags.includes(tagFilter)) return false;
          }

          return true;
        });

        const hasVisibleQuestions = visibleQuestions.length > 0;

        return (
          <details
            key={passage.id}
            className="group rounded-ds-2xl border border-border/70 bg-background/60 p-3 md:p-4"
          >
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="neutral" size="xs">
                    Passage {idx + 1}
                  </Badge>
                  {passage.subtitle && (
                    <span className="truncate max-w-[220px] md:max-w-xs">
                      {passage.subtitle}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {passage.title}
                </p>
              </div>
              <Icon
                name="ChevronDown"
                size={16}
                className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="mt-3 space-y-3">
              {/* Passage content preview */}
              <Card className="rounded-ds-xl border border-border/60 bg-card/80 p-3 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                <div className="space-y-1 leading-relaxed">
                  {passage.content}
                </div>
              </Card>

              {/* Questions */}
              <div className="space-y-2">
                {hasVisibleQuestions ? (
                  visibleQuestions.map((q, qIndex) => {
                    const ans = answersMap.get(q.id);
                    const isCorrect = ans?.isCorrect ?? false;

                    const selected = ans?.selectedAnswer;
                    const selectedLabel = Array.isArray(selected)
                      ? selected.join(', ')
                      : selected ?? 'Not answered';

                    const correctAnswer: any = (q as any).correctAnswer;
                    let correctLabel: string | null = null;
                    if (typeof correctAnswer === 'string') {
                      correctLabel = correctAnswer;
                    } else if (Array.isArray(correctAnswer)) {
                      correctLabel = correctAnswer.join(', ');
                    } else if (correctAnswer && typeof correctAnswer === 'object') {
                      correctLabel = JSON.stringify(correctAnswer);
                    }

                    return (
                      <Card
                        key={q.id}
                        className="rounded-ds-xl border border-border/60 bg-card/90 p-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                Q{q.questionOrder ?? qIndex + 1}
                              </span>
                              {q.instruction && (
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {q.instruction}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {q.prompt}
                            </p>
                          </div>

                          <Badge
                            variant={isCorrect ? 'success' : 'destructive'}
                            size="xs"
                            className="shrink-0"
                          >
                            {isCorrect ? 'Correct' : 'Wrong'}
                          </Badge>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Your answer
                            </p>
                            <p className="text-xs text-foreground break-words">
                              {selectedLabel}
                            </p>
                          </div>
                          {correctLabel && (
                            <div className="space-y-1">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Correct answer
                              </p>
                              <p className="text-xs text-foreground break-words">
                                {correctLabel}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No questions in this passage match the current filters.
                  </p>
                )}
              </div>
            </div>
          </details>
        );
      })}

      {sortedPassages.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          No passages found for this test.
        </p>
      )}
    </div>
  );
};
