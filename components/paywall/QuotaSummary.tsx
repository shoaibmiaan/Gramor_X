import React from "react";

type Props = {
  used?: number;
  limit?: number | null;
  label?: string;
  className?: string;
};

function BaseQuotaSummary({ used = 0, limit = null, label = "Usage", className }: Props) {
  const text = limit == null ? `${used} used` : `${used}/${limit} used`;
  return (
    <div className={["rounded-xl border p-3 text-sm", className].filter(Boolean).join(" ")}>
      <div className="font-medium">{label}</div>
      <div className="opacity-80">{text}</div>
    </div>
  );
}

export const QuotaSummary = BaseQuotaSummary;
export default BaseQuotaSummary;
