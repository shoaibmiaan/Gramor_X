import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap focus within a container while `active` is true. Restores focus when deactivated.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, ref: RefObject<T>) {
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const node = ref.current;
    if (!node) return;

    previous.current = (document.activeElement as HTMLElement) ?? null;

    const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) =>
      el.getAttribute('tabindex') !== '-1' && !el.hasAttribute('data-focus-guard'),
    );

    const focusTarget = focusables[0] ?? node;
    requestAnimationFrame(() => {
      if (typeof focusTarget.focus === 'function') {
        focusTarget.focus({ preventScroll: true });
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => {
        previous.current?.focus?.();
        previous.current = null;
      });
    };
  }, [active, ref]);
}

export default useFocusTrap;
