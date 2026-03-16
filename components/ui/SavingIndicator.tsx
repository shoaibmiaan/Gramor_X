import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

type SavingIndicatorProps = {
  isSaving: boolean;
  isSaved: boolean;
  error?: string | null;
  syncState?: 'synced' | 'saving' | 'pending' | 'offline';
  onRetry?: () => void;
  className?: string;
};

export function SavingIndicator({
  isSaving,
  isSaved,
  error,
  syncState,
  onRetry,
  className,
}: SavingIndicatorProps) {
  const isConflict = Boolean(error?.toLowerCase().includes('another session'));

  if (error) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-xs text-destructive', className)}>
        {isConflict ? 'Updated elsewhere. Reload to see latest changes.' : 'Changes not saved.'}
        {onRetry && !isConflict && (
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
        {isConflict && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload();
            }}
          >
            Reload
          </Button>
        )}
      </span>
    );
  }

  if (isSaving || syncState === 'saving') {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}
      >
        <Icon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (syncState === 'offline') {
    return <span className={cn('text-xs text-amber-600', className)}>Offline — pending sync</span>;
  }

  if (syncState === 'pending') {
    return <span className={cn('text-xs text-amber-600', className)}>Pending changes</span>;
  }

  if (isSaved || syncState === 'synced') {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}
      >
        <Icon name="check" className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  }

  return null;
}
