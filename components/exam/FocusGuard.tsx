import { useEffect, useState } from 'react';
import { Alert } from '@/components/design-system/Alert';
import { recordFocusViolation } from '@/lib/examSecurity';

interface Props {
  exam: string;
  slug?: string;
  /** Whether the guard should actively request fullscreen + track focus. */
  active?: boolean;
  /** Called when fullscreen is exited while the guard is active. */
  onFullscreenExit?: () => void;
}

export default function FocusGuard({ exam, slug, active = false, onFullscreenExit }: Props) {
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    if (!active) {
      setWarn(false);
      if (document.fullscreenElement === document.documentElement) {
        void document.exitFullscreen().catch(() => {});
      }
      return;
    }

    const root = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
    let enteredFullscreen = false;
    let wasHidden = false;
    let timer: number | undefined;

    root.requestFullscreen?.().then(() => {
      enteredFullscreen = true;
    }).catch(() => {
      enteredFullscreen = false;
    });

    const onVisibility = () => {
      if (!active) return;
      if (document.hidden) {
        wasHidden = true;
        recordFocusViolation({ exam, testSlug: slug, type: 'visibilitychange' });
      } else if (wasHidden) {
        wasHidden = false;
        setWarn(true);
        timer = window.setTimeout(() => setWarn(false), 5000);
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && enteredFullscreen) {
        onFullscreenExit?.();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (timer) window.clearTimeout(timer);
      if (enteredFullscreen && document.fullscreenElement === document.documentElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, [active, exam, slug, onFullscreenExit]);

  return warn ? (
    <div className="fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2">
      <Alert variant="warning" title="Stay focused" role="alert" aria-live="assertive">
        Switching tabs is recorded and may invalidate your attempt.
      </Alert>
    </div>
  ) : null;
}