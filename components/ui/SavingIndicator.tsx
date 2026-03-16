import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

type SavingIndicatorProps = {
  isSaving: boolean;
  isSaved: boolean;
  error?: string | null;
  className?: string;
};

export function SavingIndicator({ isSaving, isSaved, error, className }: SavingIndicatorProps) {
  const isConflict = Boolean(error?.toLowerCase().includes('another session'));

  if (error) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-xs text-destructive', className)}>
        {isConflict
          ? 'Your data has been updated in another session. Please reload to see the latest version.'
          : 'Auto-save failed'}
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

  if (isSaving) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}
      >
        <Icon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (isSaved) {
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
