import * as React from 'react';
import clsx from 'clsx';

// Shared utility for class name concatenation
const cn = (...classes: Array<string | false | null | undefined>) => clsx(classes);

// Shared types
type FieldSize = 'sm' | 'md' | 'lg';
type FieldVariant = 'solid' | 'subtle' | 'ghost' | 'underline';

// Shared size mapping
const sizeMap: Record<FieldSize, string> = {
  sm: 'h-10 px-sm text-sm',
  md: 'h-11 px-md text-base',
  lg: 'h-12 px-lg text-base',
};

// Shared base styles
const baseStyles = {
  input:
    'w-full border text-text placeholder:text-muted/80 rounded-ds-xl bg-panel ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-shadow disabled:opacity-60 disabled:cursor-not-allowed',
};

// Shared variant mapping
const variantMap: Record<FieldVariant, string> = {
  solid: cn(baseStyles.input, 'border-border'),
  subtle: cn(baseStyles.input, 'border-transparent bg-card'),
  ghost: cn(baseStyles.input, 'border-transparent bg-transparent'),
  underline: cn(
    baseStyles.input,
    'border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-accent'
  ),
};

// Shared props
type SelectOption =
  | string
  | Readonly<{
      value: string;
      label: React.ReactNode;
      disabled?: boolean;
    }>;

type SelectProps = {
  label?: string;
  hint?: string;
  error?: string | null;
  size?: FieldSize;
  variant?: FieldVariant;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  required?: boolean;
  className?: string;
  id?: string;
  options?: ReadonlyArray<SelectOption>;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>;

// Shared field wrapper component
const FieldWrapper: React.FC<{
  id: string;
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  hintId?: string;
  errorId?: string;
  children: React.ReactNode;
}> = React.memo(({ id, label, hint, error, required, hintId, errorId, children }) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-muted"
      >
        {label}
        {required && <span className="ml-1 text-warn" aria-hidden>*</span>}
      </label>
    )}
    {children}
    {(hint || error) && (
      <p
        id={error ? errorId : hintId}
        className={cn('mt-1 text-xs', error ? 'text-bad' : 'text-muted')}
      >
        {error || hint}
      </p>
    )}
  </div>
));

FieldWrapper.displayName = 'FieldWrapper';

// Select component
export const Select = React.memo(
  React.forwardRef<HTMLSelectElement, SelectProps>(
    (
      {
        id,
        label,
        hint,
        error,
        required,
        className,
        size = 'md',
        variant = 'solid',
        leftSlot,
        rightSlot,
        disabled,
        options,
        children,
      ...props
      },
      ref
    ) => {
      const autoId = React.useId();
      const selectId = id ?? autoId;
      const hintId = hint ? `${selectId}-hint` : undefined;
      const errorId = error ? `${selectId}-error` : undefined;

      const hasLeft = !!leftSlot;
      const hasRight = !!rightSlot;

      return (
        <FieldWrapper
          id={selectId}
          label={label}
          hint={hint}
          error={error}
          required={required}
          hintId={hintId}
          errorId={errorId}
        >
          <div className="relative flex items-center">
            {hasLeft && (
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                {leftSlot}
              </span>
            )}
            <select
              ref={ref}
              id={selectId}
              aria-invalid={!!error}
              aria-describedby={errorId ?? hintId}
              disabled={disabled}
              required={required}
              className={cn(
                'text-[16px] w-full bg-transparent outline-none appearance-none',
                variantMap[variant],
                sizeMap[size],
                hasLeft && (size === 'sm' ? 'pl-9' : size === 'md' ? 'pl-10' : 'pl-12'),
                hasRight && (size === 'sm' ? 'pr-9' : size === 'md' ? 'pr-10' : 'pr-12'),
                error && 'border-bad focus-visible:ring-0 focus-visible:border-bad',
                className
              )}
              {...props}
            >
              {children ??
                options?.map((option) => {
                  if (typeof option === 'string') {
                    return (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    );
                  }
                  return (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  );
                })}
            </select>
            {hasRight && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
                {rightSlot}
              </span>
            )}
          </div>
        </FieldWrapper>
      );
    }
  )
);

Select.displayName = 'Select';
export default Select;
