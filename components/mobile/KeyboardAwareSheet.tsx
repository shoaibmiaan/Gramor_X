/* eslint-disable ds-guard/no-inline-style */
import clsx from 'clsx';
import React, { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { SafeArea } from './SafeArea';

export type KeyboardAwareSheetProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

const noop = () => undefined;

export function KeyboardAwareSheet({ open, title, description, onClose, children, className }: KeyboardAwareSheetProps) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTarget = panelRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const labelledBy = useMemo(() => (title ? `sheet-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined), [title]);
  const describedBy = useMemo(() => {
    if (!description) return undefined;
    const baseId = labelledBy ?? 'sheet-description';
    return `${baseId}-desc`;
  }, [description, labelledBy]);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[60] flex flex-col bg-black/40 backdrop-blur transition-opacity duration-200',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      role="presentation"
    >
      <button type="button" className="flex-1" aria-label="Close" onClick={open ? onClose : noop} />
        <SafeArea bottom padding={{ bottom: 0 }} className="pointer-events-auto">
          {/* eslint-disable-next-line ds-guard/no-inline-style */}
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className={clsx(
            'mx-auto w-full max-w-lg rounded-t-[32px] border border-border/60 bg-background px-5 pb-6 pt-4 shadow-xl focus:outline-none',
            className,
          )}
          style={{ paddingBottom: `calc(${16 + keyboardOffset}px + env(safe-area-inset-bottom, 0px))` }}
        >
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-border/80" aria-hidden="true" />
          {title ? (
            <h2 id={labelledBy} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p id={describedBy} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </SafeArea>
    </div>
  );
}

export default KeyboardAwareSheet;
