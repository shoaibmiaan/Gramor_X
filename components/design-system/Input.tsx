import * as React from "react";

function cn(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

export type InputProps = Readonly<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
    label?: string;
    error?: string | null;
    hint?: string;
    required?: boolean;
    size?: "sm" | "md" | "lg";
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
  }
>;

const sizes: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-3 text-base",
  lg: "h-12 px-4 text-base",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      error,
      hint,
      className,
      size = "md",
      leftSlot,
      rightSlot,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? React.useId();
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-muted-foreground"
          >
            {label}{" "}
            {required && (
              <span aria-hidden="true" className="text-sunsetOrange">
                *
              </span>
            )}
          </label>
        )}
        <div
          className={cn(
    "w-full bg-transparent outline-none text-[16px]",
    sizes[size],
    leftSlot ? "pl-0" : undefined,
    rightSlot ? "pr-0" : undefined,
    className
  )}
        >
          {leftSlot && <span className="pl-3 pr-2 inline-flex">{leftSlot}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              "w-full bg-transparent outline-none text-[16px]",
              sizes[size],
              leftSlot ? "pl-0" : undefined,
              rightSlot ? "pr-0" : undefined,
              className
            )}
            {...props}
          />
          {rightSlot && <span className="pr-3 pl-2 inline-flex">{rightSlot}</span>}
        </div>
        {hint && !error && (
          <p id={hintId} className="mt-1 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs text-sunsetOrange">
            {error}
          </p>
        )}
      </div>
    );
  }
);
(Input as any).displayName = "Input";
