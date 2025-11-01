import * as React from "react";

function cn(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

export type RadioProps = Readonly<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label?: React.ReactNode;
    description?: React.ReactNode;
    error?: string | null;
  }
>;

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ id, name, label, description, error, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descId = description ? `${inputId}-desc` : undefined;
    const errId = error ? `${inputId}-error` : undefined;

    return (
      <div className={cn('flex items-start gap-3 text-text', className)}>
        <span className="relative inline-flex items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="radio"
            aria-describedby={error ? errId : descId}

            className={cn(
              'peer h-5 w-5 shrink-0 rounded-full border border-border bg-card',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
              error && 'border-bad'
            )}
            {...props}
          />
          <span className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-accent opacity-0 peer-checked:opacity-100" />
        </span>

        <div className="min-w-0">
          {label && (
            <label htmlFor={inputId} className="block text-small font-medium text-text">
              {label}
            </label>
          )}
          {description && (
            <p id={descId} className="mt-0.5 text-small text-muted">
              {description}
            </p>
          )}
          {error && (
            <p id={errId} className="mt-0.5 text-small text-bad">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Radio.displayName = "Radio";  // Fixed display name issue
