'use client';

import * as React from 'react';
import { Skeleton } from '@/components/design-system/Skeleton';

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

export type FieldSize = 'sm' | 'md' | 'lg';
export type FieldVariant = 'solid' | 'subtle' | 'ghost' | 'underline';

export type InputProps = Readonly<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    label?: string;
    hint?: string;
    helperText?: string;
    error?: string | null;
    size?: FieldSize;
    variant?: FieldVariant;
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
    isLoading?: boolean;
  }
>;

const sizeMap: Record<FieldSize, string> = {
  sm: 'h-9 px-3 text-small rounded-ds-lg',
  md: 'h-10 px-4 text-base rounded-ds-xl',   // 40px = guideline min height
  lg: 'h-12 px-5 text-base rounded-ds-2xl',
};

const baseInput =
  'w-full border border-border bg-input text-foreground placeholder:text-muted-foreground/70 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ' +
  'focus-visible:ring-offset-2 ring-offset-background transition-all';

const variantMap: Record<FieldVariant, string> = {
  solid: baseInput + ' hover:border-primary/40 hover:bg-accent/30',
  subtle:
    'w-full border border-transparent bg-card text-foreground placeholder:text-muted-foreground/70 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ' +
    'focus-visible:ring-offset-2 ring-offset-background transition-all hover:bg-accent/30',
  ghost:
    'w-full border border-transparent bg-transparent text-foreground placeholder:text-muted-foreground/70 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ' +
    'focus-visible:ring-offset-2 ring-offset-background transition-all hover:bg-accent/20',
  underline:
    'w-full border-0 border-b border-border bg-transparent text-foreground placeholder:text-muted-foreground/70 ' +
    'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 transition-all hover:border-primary/60',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      className,
      label,
      hint,
      helperText,
      error,
      size = 'md',
      variant = 'solid',
      required,
      leftSlot,
      rightSlot,
      disabled,
      readOnly,
      isLoading = false,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const inputId = id ?? uid;

    const resolvedHint = helperText ?? hint;
    const hintId = resolvedHint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    const hasLeft = Boolean(leftSlot);
    const hasRight = Boolean(rightSlot) || isLoading;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-small font-medium text-muted-foreground"
          >
            {label}
            {required && <span className="ml-1 text-sunsetOrange" aria-hidden>*</span>}
          </label>
        )}

        <div className="relative">
          {hasLeft && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              {leftSlot}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            aria-required={required}
            disabled={disabled || isLoading}
            readOnly={readOnly}
            className={cx(
              'text-[16px]', // iOS zoom guard
              variantMap[variant],
              sizeMap[size],
              hasLeft && (size === 'sm' ? 'pl-9' : size === 'md' ? 'pl-10' : 'pl-11'),
              hasRight && (size === 'sm' ? 'pr-9' : size === 'md' ? 'pr-10' : 'pr-11'),
              disabled && 'opacity-60 cursor-not-allowed bg-muted/50',
              readOnly && 'bg-muted/30 cursor-default',
              error && 'border-sunsetOrange focus-visible:ring-0 focus-visible:border-sunsetOrange',
              className
            )}
            {...props}
          />

          {isLoading && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Skeleton shape="circle" className="h-4 w-4" />
            </span>
          )}

          {!isLoading && hasRight && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
              {rightSlot}
            </span>
          )}
        </div>

        <div className="mt-1 min-h-[1.25rem]">
          {error ? (
            <p id={errorId} className="text-caption text-sunsetOrange">
              {error}
            </p>
          ) : resolvedHint ? (
            <p id={hintId} className="text-caption text-muted-foreground">
              {resolvedHint}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
