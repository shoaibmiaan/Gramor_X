import React from 'react';

export function WordStrengthIndicator({ label, score }: { label: string; score: number }) {
  const tone = score >= 70 ? 'success' : score >= 45 ? 'warning' : 'danger';
  const value = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <progress className="ds-linear-progress" data-tone={tone} value={value} max={100} aria-label={`${label} strength`} />
    </div>
  );
}

export default WordStrengthIndicator;
