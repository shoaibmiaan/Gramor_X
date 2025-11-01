import React from "react";

type Variant = "accent" | "primary" | "success" | "warning" | "info" | "neutral"; // Added 'info' and 'neutral'
type Position = "top-right" | "top-left";

const variantCls: Record<Variant, string> = {
  accent: 'from-accent to-warn',
  primary: 'from-accent to-accent2',
  success: 'from-ok to-accent2',
  warning: 'from-warn to-accent2',
  info: 'from-accent2 to-accent',
  neutral: 'from-muted to-border',
};

const posWrap: Record<Position, string> = {
  "top-right": "top-2 -right-10 rotate-45",
  "top-left": "top-2 -left-10 -rotate-45",
};

export const Ribbon: React.FC<{
  label: string;
  variant?: Variant;
  position?: Position;
  className?: string;
}> = ({
  label,
  variant = "accent",
  position = "top-right",
  className = "",
}) => {
  return (
    <div
      className={`pointer-events-none absolute ${posWrap[position]} ${className}`}
      aria-hidden="true"
    >
      <span
        className={`inline-block px-lg py-2xs text-caption font-bold tracking-wide text-bg-light bg-gradient-to-r ${variantCls[variant]} shadow-glow rounded-ds-xl`}
      >
        {label}
      </span>
    </div>
  );
};
