import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>;

export function Button({ children, className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
        {
          'bg-indigo-600 text-white hover:bg-indigo-500': variant === 'primary',
          'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100':
            variant === 'secondary',
          'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800':
            variant === 'ghost',
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
