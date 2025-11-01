import * as React from "react";

function cn(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

export type CheckboxProps = Readonly<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label?: React.ReactNode;
    description?: React.ReactNode;
    error?: string | null;
    onCheckedChange?: (checked: boolean) => void;
  }
>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, name, label, description, error, className, onCheckedChange, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descId = description ? `${inputId}-desc` : undefined;
    const errId = error ? `${inputId}-error` : undefined;
    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
        onCheckedChange?.(event.target.checked);
      },
      [onChange, onCheckedChange],
    );

    return (
      <div className={cn('flex items-start gap-3 text-text', className)}>
        <span className="relative inline-flex items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="checkbox"
            aria-describedby={error ? errId : descId}
            aria-invalid={!!error || undefined}
            className={cn(
              'peer h-5 w-5 shrink-0 rounded-ds border border-border bg-card',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
              error && 'border-bad'
            )}
            onChange={handleChange}
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
Checkbox.displayName = "Checkbox";  // Fixed display name issue
