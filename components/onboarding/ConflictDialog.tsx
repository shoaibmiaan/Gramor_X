import { Button } from '@/components/design-system/Button';

type ConflictDialogProps = {
  message: string;
  onReload: () => void;
};

export function ConflictDialog({ message, onReload }: ConflictDialogProps) {
  return (
    <div className="mb-4 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-amber-900">
      <p className="text-sm">{message}</p>
      <div className="mt-2">
        <Button variant="secondary" size="sm" onClick={onReload}>
          Reload
        </Button>
      </div>
    </div>
  );
}
