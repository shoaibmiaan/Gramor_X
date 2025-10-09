import * as React from 'react';

type PrTimerProps = {
  seconds: number;
  onElapsed?: () => void;
};

export function PrTimer({ seconds, onElapsed }: PrTimerProps) {
  const [left, setLeft] = React.useState(seconds);

  React.useEffect(() => {
    setLeft(seconds);
    const id = window.setInterval(() => setLeft((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  React.useEffect(() => {
    if (left === 0) onElapsed?.();
  }, [left, onElapsed]);

  const minutes = Math.floor(left / 60);
  const secondsRemaining = left % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`;
  const srLabel = `Time remaining: ${minutes} minute${minutes === 1 ? '' : 's'} and ${secondsRemaining} second${
    secondsRemaining === 1 ? '' : 's'
  }`;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Time remaining"
      className="pr-font-mono pr-text-lg pr-rounded-lg pr-px-2 pr-py-1 pr-bg-[var(--pr-card)] pr-border pr-border-[var(--pr-border)] pr-inline-flex pr-items-center pr-gap-2"
    >
      <span aria-hidden="true" role="img">
        ⏱️
      </span>
      <span aria-hidden="true">{formatted}</span>
      <span className="sr-only">{srLabel}</span>
    </div>
  );
}
