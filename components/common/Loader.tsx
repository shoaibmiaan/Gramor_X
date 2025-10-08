import React from 'react';
import clsx from 'clsx';

interface LoaderProps {
  label?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ label = 'Loading…', className }) => {
  return (
    <div className={clsx('flex items-center gap-2 text-muted-foreground', className)} role="status" aria-live="polite">
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-border border-t-transparent" aria-hidden="true" />
      <span className="text-small font-medium">{label}</span>
    </div>
  );
};

export default Loader;
