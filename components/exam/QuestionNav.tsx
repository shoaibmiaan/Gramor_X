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
    <div className="w-full border-b border-[#2B2B2B] bg-[#1F1F1F] text-white font-[Arial,'Segoe UI',system-ui,sans-serif]">
      {/* TOP BAR: FILTERS + COUNTS */}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] leading-none">
        {/* LEFT: FILTERS */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-[2px] bg-[#262626] border border-[#333] rounded-[2px] px-[4px] py-[2px]">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                statusFilter === "all"
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
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
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
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
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
              )}
            >
              Unanswered
            </button>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-[2px] bg-[#262626] border border-[#333] rounded-[2px] px-[4px] py-[2px]">
            <span className="text-[10px] uppercase tracking-[0.04em] text-[#A0A0A0] mr-1">
              Type
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-1.5 py-[1px] text-[10px] uppercase tracking-[0.04em]",
                typeFilter === "all"
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
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
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
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
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
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
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
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
                  ? "bg-[#3A3A3A] text-[#F2F2F2]"
                  : "text-[#C5C5C5]"
              )}
            >
              Match
            </button>
          </div>
        </div>

        {/* RIGHT: META TEXT */}
        <div className="flex items-center gap-3 text-[10px] text-[#C5C5C5]">
          <span>
            Total questions:{" "}
            <span className="text-[#F2F2F2] font-semibold">
              {questions.length}
            </span>
          </span>
        </div>
      </div>

      {/* QUESTION MAP GRID */}
      <div className="px-3 pb-2 pt-1 bg-[#202020] border-t border-[#2B2B2B]">
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

            let bg = "#2A2A2A";
            let border = "#3A3A3A";
            let text = "#EAEAEA";

            if (!answered && !flagged) {
              bg = "#1F1F1F";
              border = "#3A3A3A";
              text = "#BFBFBF";
            }

            if (answered && !flagged) {
              bg = "#F2F2F2";
              border = "#C3C3C3";
              text = "#1A1A1A";
            }

            if (flagged) {
              bg = "#3B2F14";
              border = "#F2C94C";
              text = "#F2D174";
            }

            if (isCurrent) {
              bg = "#2D4D8F";
              border = "#4C7EDB";
              text = "#FFFFFF";
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
                  dimmed && "opacity-45"
                )}
                style={{
                  backgroundColor: bg,
                  borderColor: border,
                  color: text,
                }}
              >
                {qNum}
              </button>
            );
          })}
        </div>

        {/* LEGEND */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[#BFBFBF]">
          <LegendSwatch
            label="Current"
            bg="#2D4D8F"
            border="#4C7EDB"
          />
          <LegendSwatch
            label="Answered"
            bg="#F2F2F2"
            border="#C3C3C3"
            fg="#1A1A1A"
          />
          <LegendSwatch
            label="Unanswered"
            bg="#1F1F1F"
            border="#3A3A3A"
          />
          <LegendSwatch
            label="Flagged"
            bg="#3B2F14"
            border="#F2C94C"
            fg="#F2D174"
          />
        </div>
      </div>
    </div>
  );
};

const LegendSwatch: React.FC<{
  label: string;
  bg: string;
  border: string;
  fg?: string;
}> = ({ label, bg, border, fg = "#EAEAEA" }) => {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-[14px] w-[18px] rounded-[2px] border"
        style={{ backgroundColor: bg, borderColor: border }}
      />
      <span style={{ color: "#C5C5C5" }} className="text-[10px]">
        {label}
      </span>
    </div>
  );
};

export default QuestionNav;
