import { Button } from '@/components/design-system/Button';
import { cn } from '@/lib/utils';

type ErrorAlertProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorAlert({ message, onRetry, className }: ErrorAlertProps) {
  return (
    <div
      className={cn(
        'mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{message}</p>
        {onRetry && (
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
