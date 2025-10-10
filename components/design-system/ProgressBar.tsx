import React, { useId } from "react";
import clsx from "clsx";

export type ProgressTone = "default" | "info" | "success" | "warning" | "danger";

export type ProgressBarProps = {
  value: number; // 0..100
  label?: string;
  className?: string;
  tone?: ProgressTone;
  ariaLabel?: string;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  className,
  tone = "default",
  ariaLabel,
}) => {
  const v = Math.max(0, Math.min(100, value));
  const labelId = useId();

  return (
    <div className={clsx("w-full", className)}>
      {label && (
        <div id={labelId} className="mb-1 text-small text-mutedText">
          {label}
        </div>
      )}
      <progress
        className="ds-linear-progress"
        value={v}
        max={100}
        data-tone={tone}
        aria-label={label ? undefined : ariaLabel ?? "Progress"}
        aria-labelledby={label ? labelId : undefined}
      />
    </div>
  );
};
