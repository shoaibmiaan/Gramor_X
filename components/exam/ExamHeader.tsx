// components/exam/ExamHeader.tsx
import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/design-system/Button";
import { Icon } from "@/components/design-system/Icon";
import { cn } from "@/lib/utils";

export type ExamHeaderProps = {
  examLabel?: string; // e.g. "IELTS READING · ACADEMIC"
  title: string;      // test name
  subtitle?: string;  // short description
  metaLeft?: React.ReactNode;   // stats row (questions, passages, minutes, flagged)
  metaRight?: React.ReactNode;  // zoom / timer block
  onExitHref?: string;          // where "Exit test" should go
  onExitClick?: () => void;     // optional extra handler
  className?: string;
};

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  examLabel,
  title,
  subtitle,
  metaLeft,
  metaRight,
  onExitHref,
  onExitClick,
  className,
}) => {
  const hasExit = onExitHref || onExitClick;

  const exitButton = hasExit ? (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "h-8 px-3 text-[11px] font-semibold rounded-full",
        "border-destructive/40 text-destructive",
        "hover:bg-destructive/5 hover:text-destructive"
      )}
      onClick={onExitClick}
    >
      <Icon name="log-out" className="mr-1.5 h-3.5 w-3.5" />
      Exit test
    </Button>
  ) : null;

  const exitWrapped =
    onExitHref && onExitClick
      ? (
        <Link href={onExitHref} onClick={onExitClick}>
          {exitButton}
        </Link>
      )
      : onExitHref
      ? (
        <Link href={onExitHref}>
          {exitButton}
        </Link>
      )
      : exitButton;

  return (
    <header
      className={cn(
        "px-3 py-3 sm:px-4 sm:py-3",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* LEFT: label, title, subtitle, stats */}
        <div className="flex-1 min-w-0">
          {examLabel && (
            <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              {examLabel}
            </div>
          )}
          <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-[13px] text-muted-foreground">
              {subtitle}
            </p>
          )}

          {metaLeft && (
            <div className="mt-2">
              {metaLeft}
            </div>
          )}
        </div>

        {/* RIGHT: controls + timer + exit */}
        <div className="mt-1 flex flex-col items-end gap-2 sm:mt-0 sm:ml-4">
          {/* zoom / theme / timer etc. */}
          {metaRight && (
            <div className="flex flex-col items-end gap-2">
              {metaRight}
            </div>
          )}

          {/* Exit test button pinned to top-right like IELTS CBE */}
          {exitWrapped && (
            <div className="flex items-center justify-end">
              {exitWrapped}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ExamHeader;
