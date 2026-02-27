// components/exam/ExamFooter.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type ExamFooterProps = {
  currentQuestion: number;
  totalQuestions: number;
  primaryLabel: string;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  className?: string;
};

export const ExamFooter: React.FC<ExamFooterProps> = ({
  currentQuestion,
  totalQuestions,
  primaryLabel,
  onPrimaryClick,
  primaryDisabled,
  secondaryLabel,
  onSecondaryClick,
  className,
}) => {
  return (
    <footer
      className={cn(
        "w-full h-[44px]",
        "bg-[#1A1A1A] border-t border-[#2B2B2B]",
        "flex items-center justify-between px-4",
        "text-white font-[Arial,'Segoe UI',system-ui,sans-serif]",
        className
      )}
    >
      {/* LEFT BUTTONS */}
      <div className="flex items-center gap-2">
        {secondaryLabel && onSecondaryClick && (
          <button
            onClick={onSecondaryClick}
            className="
              h-[28px] px-[14px]
              text-[12px] font-semibold uppercase tracking-[0.04em]
              bg-[#2A2A2A]
              border border-[#3A3A3A]
              rounded-[2px]
              hover:bg-[#333]
              active:bg-[#444]
              transition-none
            "
          >
            {secondaryLabel}
          </button>
        )}

        <button
          disabled={primaryDisabled}
          onClick={onPrimaryClick}
          className={cn(
            `
            h-[28px] px-[14px]
            text-[12px] font-semibold uppercase tracking-[0.04em]
            bg-[#2A2A2A]
            border border-[#3A3A3A]
            rounded-[2px]
            hover:bg-[#333]
            active:bg-[#444]
            transition-none
          `,
            primaryDisabled && "opacity-50 pointer-events-none"
          )}
        >
          {primaryLabel}
        </button>
      </div>

      {/* RIGHT: QUESTION TEXT */}
      <div className="text-[12px] tracking-wide">
        <span className="text-[#F2F2F2]">
          Question{" "}
          <span className="font-bold text-white">{currentQuestion}</span>
          {" of "}
          {totalQuestions}
        </span>
      </div>
    </footer>
  );
};

export default ExamFooter;
