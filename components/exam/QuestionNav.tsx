import * as React from "react";
import { cn } from "@/lib/utils";
import type { ReadingQuestion } from "@/lib/reading/types";

type AnswerValue = string | string[] | Record<string, any> | null;
type FilterStatus = "all" | "flagged" | "unanswered";
type FilterType = "all" | "tfng" | "ynng" | "mcq" | "gap" | "match";

type QuestionNavProps = {
  questions: ReadingQuestion[];
  answers: Record<string, AnswerValue>;
  flags: Record<string, boolean>;
  currentQuestionId: string;
  onJump: (id: string) => void;
  statusFilter: FilterStatus;
  typeFilter: FilterType;
  setStatusFilter: (value: FilterStatus) => void;
  setTypeFilter: (value: FilterType) => void;
};

const isAnswered = (value: AnswerValue) => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value).some(
      (v) => (v ?? "").toString().trim() !== ""
    );
  }
  return false;
};

export const QuestionNav: React.FC<QuestionNavProps> = ({
  questions,
  answers,
  flags,
  currentQuestionId,
  onJump,
  statusFilter,
  typeFilter,
  setStatusFilter,
  setTypeFilter,
}) => {
  // We *don’t* hide questions with filters in nav; we only DIM them (CBE-style).
  const isStatusVisible = (
    qId: string,
    statusFilter: FilterStatus
  ): boolean => {
    const answered = isAnswered(answers[qId]);
    const flagged = !!flags[qId];

    if (statusFilter === "all") return true;
    if (statusFilter === "flagged") return flagged;
    if (statusFilter === "unanswered") return !answered;
    return true;
  };

  const isTypeVisible = (
    q: ReadingQuestion,
    typeFilter: FilterType
  ): boolean => {
    // @ts-ignore reading type
    const t = (q.questionTypeId ?? "all") as FilterType;
    if (typeFilter === "all") return true;
    return t === typeFilter;
  };

  return (
    <div className="w-full border-b border-border bg-darker text-white font-[Arial,'Segoe UI',system-ui,sans-serif]">
      {/* TOP BAR: FILTERS + COUNTS */}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] leading-none">
        {/* LEFT: FILTERS */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-[2px] bg-dark border border-border rounded-[2px] px-[4px] py-[2px]">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                statusFilter === "all"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("flagged")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                statusFilter === "flagged"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Flagged
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unanswered")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                statusFilter === "unanswered"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Unanswered
            </button>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-[2px] bg-dark border border-border rounded-[2px] px-[4px] py-[2px]">
            <span className="text-[10px] uppercase tracking-[0.04em] text-muted-foreground/80 mr-1">
              Type
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "all"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("tfng")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "tfng"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              TFNG
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("mcq")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "mcq"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              MCQ
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("gap")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "gap"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Gap
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("match")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "match"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Match
            </button>
          </div>
        </div>

        {/* RIGHT: META TEXT */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>
            Total questions:{" "}
            <span className="text-foreground font-semibold">
              {questions.length}
            </span>
          </span>
        </div>
      </div>

      {/* QUESTION MAP GRID */}
      <div className="px-3 pb-2 pt-1 bg-darker border-t border-border">
        <div className="grid grid-cols-10 gap-[4px] text-[11px] leading-none">
          {questions.map((q, idx) => {
            const qNum = idx + 1;
            const answered = isAnswered(answers[q.id]);
            const flagged = !!flags[q.id];
            const isCurrent = q.id === currentQuestionId;

            const passesStatus = isStatusVisible(q.id, statusFilter);
            const passesType = isTypeVisible(q, typeFilter);

            // Dim if filter doesn't match
            const dimmed = !(passesStatus && passesType);

            let toneClass = "bg-dark border-border text-foreground/90";

            if (!answered && !flagged) {
              toneClass = "bg-darker border-border text-muted-foreground/80";
            }

            if (answered && !flagged) {
              toneClass = "bg-foreground border-muted text-darker";
            }

            if (flagged) {
              toneClass = "bg-warning/20 border-warning text-warning";
            }

            if (isCurrent) {
              toneClass = "bg-primary border-primaryDark text-white";
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJump(q.id)}
                className={cn(
                  "h-[24px] w-full rounded-[2px] border text-center",
                  "flex items-center justify-center",
                  "focus:outline-none",
                  toneClass,
                  dimmed && "opacity-45"
                )}
              >
                {qNum}
              </button>
            );
          })}
        </div>

        {/* LEGEND */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/80">
          <LegendSwatch
            label="Current"
            swatchClassName="bg-primary border-primaryDark"
          />
          <LegendSwatch
            label="Answered"
            swatchClassName="bg-foreground border-muted"
            labelClassName="text-darker"
          />
          <LegendSwatch
            label="Unanswered"
            swatchClassName="bg-darker border-border"
          />
          <LegendSwatch
            label="Flagged"
            swatchClassName="bg-warning/20 border-warning"
            labelClassName="text-warning"
          />
        </div>
      </div>
    </div>
  );
};

const LegendSwatch: React.FC<{
  label: string;
  swatchClassName: string;
  labelClassName?: string;
}> = ({ label, swatchClassName, labelClassName }) => {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-[14px] w-[18px] rounded-[2px] border",
          swatchClassName
        )}
      />
      <span className={cn("text-[10px] text-muted-foreground", labelClassName)}>
        {label}
      </span>
    </div>
  );
};

export default QuestionNav;
