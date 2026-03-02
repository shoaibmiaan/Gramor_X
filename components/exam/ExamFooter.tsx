// components/exam/ExamFooter.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import styles from "./ExamChrome.module.css";

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
        styles.footerShell,
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
            className={cn(
              "h-[28px] px-[14px] text-[12px] font-semibold uppercase tracking-[0.04em] rounded-[2px] transition-none",
              styles.footerButton
            )}
          >
            {secondaryLabel}
          </button>
        )}

        <button
          disabled={primaryDisabled}
          onClick={onPrimaryClick}
          className={cn(
            "h-[28px] px-[14px] text-[12px] font-semibold uppercase tracking-[0.04em] rounded-[2px] transition-none",
            styles.footerButton,
            primaryDisabled && "opacity-50 pointer-events-none"
          )}
        >
          {primaryLabel}
        </button>
      </div>

      {/* RIGHT: QUESTION TEXT */}
      <div className="text-[12px] tracking-wide">
        <span className={styles.footerMeta}>
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
