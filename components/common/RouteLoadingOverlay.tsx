import clsx from 'clsx';

interface RouteLoadingOverlayProps {
  active: boolean;
}

export function RouteLoadingOverlay({ active }: RouteLoadingOverlayProps) {
  return (
    <div
      className={clsx(
        'fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300',
        active ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!active}
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-background/90 p-8 shadow-xl ring-1 ring-border" role="status" aria-live="polite">
        <span className="h-14 w-14 animate-spin rounded-full border-[6px] border-muted border-t-primary" aria-hidden="true" />
        <p className="text-body font-medium text-muted-foreground">Loading your next page…</p>
      </div>
    </div>
  );
}

export default RouteLoadingOverlay;
