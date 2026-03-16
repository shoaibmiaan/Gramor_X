import { cn } from '@/lib/utils';

type ValidationErrorProps = {
  message?: string;
  className?: string;
};

export function ValidationError({ message, className }: ValidationErrorProps) {
  if (!message) return null;
  return <p className={cn('mt-2 text-xs text-destructive', className)}>{message}</p>;
}
