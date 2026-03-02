import * as React from "react";
import { cn } from "@/lib/utils";
import type { ReadingQuestion } from "@/lib/reading/types";
import styles from "./ExamChrome.module.css";

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
    <div className={cn("w-full text-white font-[Arial,'Segoe UI',system-ui,sans-serif]", styles.navShell)}>
      {/* TOP BAR: FILTERS + COUNTS */}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] leading-none">
        {/* LEFT: FILTERS */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className={cn("flex items-center gap-[2px] rounded-[2px] px-[4px] py-[2px]", styles.navFilterGroup)}>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                statusFilter === "all"
                  ? styles.navFilterActive
                  : styles.navFilterInactive
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
                  ? styles.navFilterActive
                  : styles.navFilterInactive
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
                  ? styles.navFilterActive
                  : styles.navFilterInactive
              )}
            >
              Unanswered
            </button>
          </div>

          {/* Type filter */}
          <div className={cn("flex items-center gap-[2px] rounded-[2px] px-[4px] py-[2px]", styles.navFilterGroup)}>
            <span className={cn("text-[10px] uppercase tracking-[0.04em] mr-1", styles.navTypeLabel)}>
              Type
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "all"
                  ? styles.navFilterActive
                  : styles.navFilterInactive
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
                  ? styles.navFilterActive
                  : styles.navFilterInactive
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
                  ? styles.navFilterActive
                  : styles.navFilterInactive
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
                  ? styles.navFilterActive
                  : styles.navFilterInactive
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
                  ? styles.navFilterActive
                  : styles.navFilterInactive
              )}
            >
              Match
            </button>
          </div>
        </div>

        {/* RIGHT: META TEXT */}
        <div className={cn("flex items-center gap-3 text-[10px]", styles.navMetaMuted)}>
          <span>
            Total questions:{" "}
            <span className={cn("font-semibold", styles.navMetaStrong)}>
              {questions.length}
            </span>
          </span>
        </div>
      </div>

      {/* QUESTION MAP GRID */}
      <div className={cn("px-3 pb-2 pt-1", styles.gridShell)}>
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

            let toneClass = styles.tileDefault;

            if (!answered && !flagged) {
              toneClass = styles.tileUnanswered;
            }

            if (answered && !flagged) {
              toneClass = styles.tileAnswered;
            }

            if (flagged) {
              toneClass = styles.tileFlagged;
            }

            if (isCurrent) {
              toneClass = styles.tileCurrent;
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
        <div className={cn("mt-2 flex flex-wrap items-center gap-3 text-[10px]", styles.legendText)}>
          <LegendSwatch
            label="Current"
            swatchClassName={styles.legendCurrent}
          />
          <LegendSwatch
            label="Answered"
            swatchClassName={styles.legendAnswered}
            labelClassName={styles.legendLabelDark}
          />
          <LegendSwatch
            label="Unanswered"
            swatchClassName={styles.legendUnanswered}
          />
          <LegendSwatch
            label="Flagged"
            swatchClassName={styles.legendFlagged}
            labelClassName={styles.legendLabelFlagged}
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
      <span className={cn("text-[10px]", styles.legendLabel, labelClassName)}>
        {label}
      </span>
    </div>
  );
};

export default QuestionNav;
