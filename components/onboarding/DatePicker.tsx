import React from 'react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string | null; // ISO date string (YYYY-MM-DD)
  onChange: (date: string | null) => void;
  disabled?: boolean;
  className?: string;
  min?: string; // ISO date string
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  min,
  placeholder = 'Select a date',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value || null);
  };

  return (
    <input
      type="date"
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      min={min}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    />
  );
};