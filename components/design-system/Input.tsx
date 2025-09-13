import * as React from 'react';
import { cx } from './_core/types';

export type InputProps = Readonly<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    label?: string;
    error?: string | null;
    hint?: string;
    required?: boolean;
    size?: 'sm'|'md'|'lg';
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
  }
>;

const sizes = {
  xs: 'h-9 px-3 text-sm',
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-3 text-base',
  lg: 'h-12 px-4 text-base',
} as const;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, className, size='md', leftSlot, rightSlot, required, ...props }, ref) => {
    const inputId = id ?? React.useId();
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm text-white/80">{label}{required && ' *'}</label>
        )}
        <div className="relative">
          {leftSlot && <div className="absolute left-3 top-1/2 -translate-y-1/2">{leftSlot}</div>}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error || undefined}
            aria-describedby={cx(hintId, errorId)}
            className={cx(
              'w-full rounded-xl bg-white/5 text-white placeholder:text-white/50 outline-none',
              'ring-1 ring-white/10 focus:ring-2 focus:ring-primary/40',
              leftSlot ? 'pl-9' : '',
              rightSlot ? 'pr-10' : '',
              sizes[size],
              className
            )}
            {...props}
          />
          {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
        </div>
        {hint && !error && <p id={hintId} className="mt-1 text-xs text-white/60">{hint}</p>}
        {error && <p id={errorId} className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;
