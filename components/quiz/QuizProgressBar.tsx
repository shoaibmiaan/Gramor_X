import React from 'react';

export function QuizProgressBar({ current, total }: { current: number; total: number }) {
  const progress = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <progress className="ds-linear-progress" value={progress} max={100} aria-label="Quiz progress" />
      <p className="mt-1 text-xs text-muted-foreground">{current}/{total}</p>
    </div>
  );
}

export default QuizProgressBar;
