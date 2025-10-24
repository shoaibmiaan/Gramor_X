import { useCallback, useEffect, useState } from 'react';

import { isBrowser } from '@/lib/env';

type InstallOutcome = 'accepted' | 'dismissed';

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

export type InstallPromptState = {
  promptEvent: DeferredPromptEvent | null;
  clearPrompt: () => void;
};

export function useInstallPrompt(): InstallPromptState {
  const [promptEvent, setPromptEvent] = useState<DeferredPromptEvent | null>(null);

  useEffect(() => {
    if (!isBrowser) return;
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall as any);
    const handleInstalled = () => setPromptEvent(null);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall as any);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const clearPrompt = useCallback(() => setPromptEvent(null), []);

  return { promptEvent, clearPrompt };
}
