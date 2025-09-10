import React from 'react';
import { ChevronDownIcon } from '@/lib/icons';

type Option = { value: string; label: string; disabled?: boolean };
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options?: Option[];
};

export const Select: React.FC<SelectProps> = ({ label, hint, error, options = [], className = '', children, ...props }) => {
  const base = [
    'w-full rounded-ds border border-border bg-card text-lightText',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-ring',
    'dark:bg-dark/50 dark:text-foreground dark:border-purpleVibe/30',
  ].join(' ');
  const invalid = error ? 'border-sunsetOrange focus:ring-sunsetOrange focus:border-sunsetOrange' : '';

  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 inline-block text-small text-mutedText">{label}</span>}
      <div className="relative">
        <select className={`${base} ${invalid} appearance-none pl-4 pr-10 py-3`} {...props}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
          <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {error ? (
        <span className="mt-1 block text-small text-sunsetOrange">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-small text-mutedText">{hint}</span>
      ) : null}
    </label>
  );
};
