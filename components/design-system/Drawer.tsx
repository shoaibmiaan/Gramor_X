import * as React from 'react';
import { Button } from './Button';
import { cx } from './_core/types';

type DrawerSide = 'left' | 'right' | 'top' | 'bottom';

type DrawerProps = Readonly<{
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: DrawerSide;
  children?: React.ReactNode;
  className?: string;
}>;

const sidePosition: Record<DrawerSide, string> = {
  right: 'inset-y-0 right-0',
  left: 'inset-y-0 left-0',
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
};

const sideSize: Record<DrawerSide, string> = {
  right: 'h-full w-[min(26rem,100vw)]',
  left: 'h-full w-[min(26rem,100vw)]',
  top: 'w-full h-[min(28rem,100vh)]',
  bottom: 'w-full h-[min(28rem,100vh)]',
};

const sideEnter: Record<DrawerSide, string> = {
  right: 'translate-x-full',
  left: '-translate-x-full',
  top: '-translate-y-full',
  bottom: 'translate-y-full',
};

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  side = 'right',
  children,
  className,
}) => {
  const titleId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (!open) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setMounted(true);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      setMounted(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-text/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cx(
          'absolute border border-border bg-card text-text shadow-xl backdrop-blur-md',
          'transition-transform duration-300 ease-out',
          sidePosition[side],
          sideSize[side],
          mounted ? 'translate-x-0 translate-y-0' : sideEnter[side],
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-md py-sm">
          <div id={titleId} className="text-small font-semibold text-text">
            {title}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close drawer"
            className="text-muted hover:text-text"
          >
            ✕
          </Button>
        </div>

        <div className="h-full overflow-auto p-md text-text/90">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;
