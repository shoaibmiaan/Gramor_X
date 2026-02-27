import { useEffect, useCallback } from 'react';

type ShortcutHandlers = {
  onPrevQuestion?: () => void;
  onNextQuestion?: () => void;
  onToggleFlag?: () => void;
  onToggleHighlightMode?: () => void;
  onOpenFilter?: () => void;
  onSubmit?: () => void;
  onExit?: () => void;
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      // Don't trigger if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (handlers.onPrevQuestion) {
            e.preventDefault();
            handlers.onPrevQuestion();
          }
          break;
        case 'ArrowRight':
          if (handlers.onNextQuestion) {
            e.preventDefault();
            handlers.onNextQuestion();
          }
          break;
        case 'f':
        case 'F':
          if (handlers.onToggleFlag) {
            e.preventDefault();
            handlers.onToggleFlag();
          }
          break;
        case 'h':
        case 'H':
          if (handlers.onToggleHighlightMode) {
            e.preventDefault();
            handlers.onToggleHighlightMode();
          }
          break;
        case '/':
          if (handlers.onOpenFilter) {
            e.preventDefault();
            handlers.onOpenFilter();
          }
          break;
        case 's':
        case 'S':
          if (handlers.onSubmit && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handlers.onSubmit();
          }
          break;
        case 'Escape':
          if (handlers.onExit) {
            e.preventDefault();
            handlers.onExit();
          }
          break;
        default:
          break;
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}