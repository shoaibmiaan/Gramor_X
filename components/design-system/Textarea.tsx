'use client';

import * as React from 'react';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'subtle' | 'ghost' | 'underline';

export type TextareaProps = Readonly<
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
    label?: string;
    hint?: string;
    error?: string | null;
    size?: Size;
    variant?: Variant;
    showCounter?: boolean;
  }
>;

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

const sizeMap: Record<Size, string> = {
  sm: 'min-h-[7.5rem] px-3 py-2 text-small rounded-ds-lg',
  md: 'min-h-[9.5rem] px-4 py-3 text-base rounded-ds-xl',
  lg: 'min-h-[12rem] px-5 py-4 text-base rounded-ds-2xl',
};

const baseField =
  'w-full border border-border placeholder:text-muted-foreground/70 text-foreground ' +
  'bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ' +
  'focus-visible:ring-offset-1 ring-offset-background transition-shadow resize-y';

const variantMap: Record<Variant, string> = {
  solid: baseField,
  subtle:
    'w-full border border-transparent bg-card text-foreground placeholder:text-muted-foreground/70 ' +
    'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 ring-offset-background resize-y',
  ghost:
    'w-full border border-transparent bg-transparent text-foreground placeholder:text-muted-foreground/70 ' +
    'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 ring-offset-background resize-y',
  underline:
    'w-full border-0 border-b border-border rounded-none bg-transparent text-foreground ' +
    'placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:border-primary resize-none',
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      className,
      label,
      hint,
      error,
      size = 'md',
      variant = 'solid',
      required,
      disabled,
      readOnly,
      maxLength,
      showCounter = false,
      onChange,
      defaultValue,
      value,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const fieldId = id ?? uid;

    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    const [count, setCount] = React.useState<number>(() => {
      const v = (value ?? defaultValue ?? '') as string;
      return v?.length ?? 0;
    });

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      if (showCounter && typeof maxLength === 'number') {
        setCount(e.currentTarget.value.length);
      }
      onChange?.(e);
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1 block text-small font-medium text-muted-foreground">
            {label}
            {required && <span className="ml-1 text-sunsetOrange" aria-hidden>*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            id={fieldId}
            ref={ref}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            required={required}
            readOnly={readOnly}
            disabled={disabled}
            maxLength={maxLength}
            onChange={handleChange}
            defaultValue={defaultValue}
            value={value}
            className={cx(
              variantMap[variant],
              sizeMap[size],
              disabled && 'opacity-60 cursor-not-allowed',
              error && 'border-sunsetOrange focus-visible:ring-0 focus-visible:border-sunsetOrange',
              className
            )}
            {...props}
          />
          {showCounter && typeof maxLength === 'number' && (
            <span className="pointer-events-none absolute bottom-2 right-3 text-caption text-muted-foreground">
              {count} / {maxLength}
            </span>
          )}
        </div>

        <div className="mt-1 min-h-[1.25rem]">
          {error ? (
            <p id={errorId} className="text-caption text-sunsetOrange">
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-caption text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
